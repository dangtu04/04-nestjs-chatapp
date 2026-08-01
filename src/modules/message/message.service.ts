import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  CreateGroupMessageDto,
  CreateMessageDto,
} from './dto/create-message.dto';
import { InjectModel } from '@nestjs/mongoose';
import {
  Conversation,
  ConversationDocument,
} from '../conversation/schemas/conversation.schema';
import { Model, Types } from 'mongoose';
import { Message } from './schemas/message.schema';
import { updateConversationAfterCreateMessage } from '@/helpers/message';
import { ConversationType } from '@/enum/conversation.enum';
import { SocketEventsService } from '@/socket/socket-events.service';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    @InjectModel(Message.name)
    private messageModel: Model<Message>,

    private readonly socketEventsService: SocketEventsService,
  ) {}
  // async sendDirectMessage(dto: CreateMessageDto, senderId: string) {
  //   const { recipientId, content, conversationId } = dto;

  //   if (!content) {
  //     throw new BadRequestException('Thiếu nội dung');
  //   }
  //   let conversation: ConversationDocument;
  //   try {
  //     if (conversationId) {
  //       conversation = await this.conversationModel.findById(conversationId);

  //       if (!conversation) {
  //         throw new BadRequestException('Không tìm thấy cuộc trò chuyện.');
  //       }
  //     }
  //     if (!conversationId) {
  //       conversation = await this.conversationModel.create({
  //         type: ConversationType.DIRECT,
  //         participants: [
  //           { userId: new Types.ObjectId(senderId), joinedAt: new Date() },
  //           { userId: new Types.ObjectId(recipientId), joinedAt: new Date() },
  //         ],
  //         lastMessageAt: new Date(),
  //         unreadCounts: new Map(),
  //       });
  //     }
  //     const message = await this.messageModel.create({
  //       conversationId: conversation._id,
  //       senderId: new Types.ObjectId(senderId),
  //       content,
  //     });

  //     updateConversationAfterCreateMessage(
  //       conversation,
  //       message,
  //       new Types.ObjectId(senderId),
  //     );
  //     await conversation.save();

  //     this.socketEventsService.emitNewMessage(conversation, message);

  //     return message;
  //   } catch (error) {
  //     console.log('Error when sending direct messages', error);
  //     if (error instanceof HttpException) {
  //       throw error;
  //     }
  //     throw new InternalServerErrorException('Lỗi hệ thống.');
  //   }
  // }

  async sendDirectMessage(dto: CreateMessageDto, senderId: string) {
    const { recipientId, content, conversationId } = dto;

    if (!content) {
      throw new BadRequestException('Thiếu nội dung');
    }
    let conversation: ConversationDocument;
    try {
      if (conversationId) {
        conversation = await this.conversationModel.findById(conversationId);
        if (!conversation) {
          throw new BadRequestException('Không tìm thấy cuộc trò chuyện.');
        }
      }
      if (!conversationId) {
        conversation = await this.conversationModel.create({
          type: ConversationType.DIRECT,
          participants: [
            { userId: new Types.ObjectId(senderId), joinedAt: new Date() },
            { userId: new Types.ObjectId(recipientId), joinedAt: new Date() },
          ],
          lastMessageAt: new Date(),
          unreadCounts: new Map(),
        });
      }

      // check trước khi update lastMessage
      const isFirstMessage = !conversation.lastMessage;

      const message = await this.messageModel.create({
        conversationId: conversation._id,
        senderId: new Types.ObjectId(senderId),
        content,
      });

      updateConversationAfterCreateMessage(
        conversation,
        message,
        new Types.ObjectId(senderId),
      );
      await conversation.save();

      if (isFirstMessage) {
        // populate để B có đủ tên/avatar hiển thị khi conversation này xuất hiện lần đầu
        await conversation.populate({
          path: 'participants.userId',
          select: 'name avatarUrl',
        });
        this.socketEventsService.emitNewConversation(
          conversation,
          message,
          recipientId,
          senderId,
        );
      } else {
        this.socketEventsService.emitNewMessage(conversation, message);
      }

      return message;
    } catch (error) {
      console.log('Error when sending direct messages', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }

  async sendGroupMessage(
    dto: CreateGroupMessageDto,
    senderId: string,
    conversation: ConversationDocument,
  ) {
    const { content } = dto;

    if (!content) {
      throw new BadRequestException('Thiếu nội dung');
    }

    try {
      const message = await this.messageModel.create({
        conversationId: conversation._id,
        senderId: new Types.ObjectId(senderId),
        content,
      });

      updateConversationAfterCreateMessage(
        conversation,
        message,
        new Types.ObjectId(senderId),
      );
      await conversation.save();

      this.socketEventsService.emitNewMessage(conversation, message);

      return message;
    } catch (error) {
      console.error('Error when sending group messages:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }
}
