import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ConversationType } from '@/enum/conversation.enum';
import { InjectModel } from '@nestjs/mongoose';
import { Conversation } from './schemas/conversation.schema';
import { Model, Types } from 'mongoose';
import { Message } from '@/modules/message/schemas/message.schema';
import { SocketEventsService } from '@/socket/socket-events.service';

@Injectable()
export class ConversationService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    @InjectModel(Message.name)
    private messageModel: Model<Message>,

    private readonly socketEventsService: SocketEventsService,
  ) {}

  async createConversation(dto: CreateConversationDto, userId: string) {
    const { type, name, memberIds } = dto;
    try {
      let conversation;

      if (type === ConversationType.DIRECT) {
        // DIRECT phải có đúng 1 người còn lại
        if (memberIds.length !== 1) {
          throw new BadRequestException(
            'Cuộc trò chuyện riêng phải có đúng 1 thành viên.',
          );
        }

        const participantId = memberIds[0];

        // Không cho chat với chính mình
        if (participantId === userId) {
          throw new BadRequestException(
            'Không thể tạo cuộc trò chuyện với chính mình.',
          );
        }

        // Tìm conversation DIRECT đã tồn tại
        conversation = await this.conversationModel.findOne({
          type: ConversationType.DIRECT,
          participants: {
            $size: 2,
          },
          'participants.userId': {
            $all: [
              new Types.ObjectId(userId),
              new Types.ObjectId(participantId),
            ],
          },
        });

        // Chưa có thì tạo mới
        if (!conversation) {
          conversation = await this.conversationModel.create({
            type: ConversationType.DIRECT,
            participants: [
              { userId: new Types.ObjectId(userId) },
              { userId: new Types.ObjectId(participantId) },
            ],
            lastMessageAt: null,
          });
        }
      }

      if (type === ConversationType.GROUP) {
        if (!name?.trim()) {
          throw new BadRequestException('Tên nhóm không được bỏ trống.');
        }

        // Loại bỏ chính mình và loại bỏ trùng lặp
        const uniqueMemberIds = [
          ...new Set(memberIds.filter((id) => id !== userId)),
        ];

        if (uniqueMemberIds.length === 0) {
          throw new BadRequestException(
            'Nhóm phải có ít nhất 1 thành viên khác.',
          );
        }

        conversation = await this.conversationModel.create({
          type: ConversationType.GROUP,
          participants: [
            { userId: new Types.ObjectId(userId) },
            ...uniqueMemberIds.map((id) => ({
              userId: new Types.ObjectId(id),
            })),
          ],
          group: {
            name: name.trim(),
            createdBy: new Types.ObjectId(userId),
          },
          lastMessageAt: null,
        });
      }

      await conversation.populate([
        {
          path: 'participants.userId',
          select: 'name avatarUrl',
        },
        {
          path: 'seenBy',
          select: 'name avatarUrl',
        },
        {
          path: 'lastMessage.senderId',
          select: 'name avatarUrl',
        },
      ]);

      const participants = (conversation.participants || []).map((p) => {
        const user = p.userId as any;
        return {
          _id: user?._id,
          name: user?.name,
          avatarUrl: user?.avatarUrl ?? null,
          joinedAt: p.joinedAt,
        };
      });

      if (type === ConversationType.DIRECT) {
        const memberIdsForJoin = [memberIds[0].toString(), userId.toString()];
        const conversationId = conversation._id.toString();
        this.socketEventsService.joinConversationMembers(
          memberIdsForJoin,
          conversationId,
        );
      }

      const formatted = { ...conversation.toObject(), participants };

      if (type === ConversationType.GROUP) {
        const memberIdsForJoin = [
          userId.toString(),
          ...memberIds.map((id) => id.toString()),
        ];
        // gửi sự kiện cho tất cả thành viên trong nhóm
        this.socketEventsService.emitNewGroup(formatted, memberIdsForJoin);

        // thêm tất cả thành viên vào room của conversation
        this.socketEventsService.joinConversationMembers(
          memberIdsForJoin,
          formatted._id.toString(),
        );
      }

      return formatted;
    } catch (error) {
      console.error('Error when creating conversation:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }
  async getConversation(userId: string) {
    try {
      const conversations = await this.conversationModel
        .find({
          'participants.userId': new Types.ObjectId(userId),
        })
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .populate({ path: 'participants.userId', select: 'name avatarUrl' })
        .populate({ path: 'lastMessage.senderId', select: 'name avatarUrl' })
        .populate({ path: 'seenBy', select: 'name avatarUrl' });

      const formatted = conversations.map((convo) => {
        const participants = (convo.participants || []).map((p) => {
          const user = p.userId as any;
          return {
            _id: user?._id,
            name: user?.name,
            avatarUrl: user?.avatarUrl ?? null,
            joinedAt: p.joinedAt,
          };
        });
        return {
          ...convo.toObject(),
          unreadCounts: convo.unreadCounts || {},
          participants,
        };
      });
      return formatted;
    } catch (error) {
      console.error('Error when creating conversation:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }
  async getMessage(
    conversationId: string,
    limit: number,
    cursor: string,
    reqSenderId: string,
  ) {
    try {
      if (!Types.ObjectId.isValid(conversationId)) {
        throw new BadRequestException('Mã hội thoại không hợp lệ.');
      }

      const conversation = await this.conversationModel.exists({
        _id: new Types.ObjectId(conversationId),
        'participants.userId': new Types.ObjectId(reqSenderId),
      });
      if (!conversation) {
        throw new BadRequestException(
          'Cuộc hội thoại không hợp lệ hoặc không tồn tại.',
        );
      }
      const query: {
        conversationId: Types.ObjectId;
        createdAt?: {
          $lt: Date;
        };
      } = {
        conversationId: new Types.ObjectId(conversationId),
      };
      if (cursor) {
        query.createdAt = { $lt: new Date(cursor) };
      }
      let messages = await this.messageModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .lean();
      let nextCursor = null;
      if (messages.length > limit) {
        const nextMessage = messages[messages.length - 1];
        nextCursor = nextMessage.createdAt.toISOString();
        messages.pop();
      }
      messages = messages.reverse();
      return {
        messages,
        nextCursor,
      };
    } catch (error) {
      console.error('Error when getting messages:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }

  async getUserConversationForSocketIo(userId: string) {
    try {
      const conversations = await this.conversationModel.find(
        {
          'participants.userId': new Types.ObjectId(userId),
        },
        { _id: 1 },
      );
      return conversations.map((c) => c._id.toString());
    } catch (error) {
      console.error('Error when get conversation:', error);
      return [];
    }
  }
  async markAsSeen(conversationId: string, userId: string) {
    try {
      if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
        throw new BadRequestException('Mã hội thoại không hợp lệ.');
      }

      const conversation = await this.conversationModel
        .findById(new Types.ObjectId(conversationId))
        .lean();

      const last = conversation.lastMessage;
      if (!last) {
        return {
          message: 'Không có tin nhắn',
        };
      }

      if (last.senderId.toString() === userId.toString()) {
        return { message: 'Người gửi không cần đánh dấu đã xem' };
      }

      const updated = await this.conversationModel.findByIdAndUpdate(
        conversationId,
        {
          $addToSet: { seenBy: userId }, // thêm user vào mảng seenby
          $set: { [`unreadCounts.${userId}`]: 0 }, // gán giá trị cho field
        },
        {
          new: true,
        },
      );

      this.socketEventsService.emitReadMessage(updated);

      return {
        seenBy: updated?.seenBy || [],
        myUnreadCount: updated?.unreadCounts[userId] || 0,
      };

      // this.
    } catch (error) {
      console.error('Error marking as read: ', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }
}
