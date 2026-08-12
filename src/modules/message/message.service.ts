import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  CreateGroupMessageDto,
  CreateMessageDto,
  SendDirectImageDto,
  SendGroupImageDto,
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
import { MessageType } from '@/enum/message.enum';
import { SocketEventsService } from '@/socket/socket-events.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    @InjectModel(Message.name)
    private messageModel: Model<Message>,

    private readonly socketEventsService: SocketEventsService,
    private readonly cloudinaryService: CloudinaryService,
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

  // gửi ảnh trong tin nhắn đơn
  async sendDirectImages(
    dto: SendDirectImageDto,
    files: Express.Multer.File[],
    senderId: string,
  ) {
    const MAX_IMAGES = 5;
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 ảnh.');
    }
    if (files.length > MAX_IMAGES) {
      throw new BadRequestException(
        `Chỉ được gửi tối đa ${MAX_IMAGES} ảnh cùng lúc.`,
      );
    }

    const { recipientId, conversationId } = dto;
    let conversation: ConversationDocument;

    try {
      if (conversationId) {
        conversation = await this.conversationModel.findById(conversationId);
        if (!conversation) {
          throw new BadRequestException('Không tìm thấy cuộc trò chuyện.');
        }
      } else {
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

      const isFirstMessage = !conversation.lastMessage;

      // upload tất cả ảnh lên Cloudinary song song
      const uploadResults = await this.cloudinaryService.uploadMultipleImages(
        files,
        'chat-images',
      );

      // tạo từng message riêng biệt cho mỗi ảnh
      const messages = await Promise.all(
        uploadResults.map((img) =>
          this.messageModel.create({
            conversationId: conversation._id,
            senderId: new Types.ObjectId(senderId),
            type: MessageType.IMAGE,
            imgUrl: img.secureUrl,
            imgPublicId: img.publicId,
          }),
        ),
      );

      // cập nhật conversation theo message cuối cùng
      const lastMessage = messages[messages.length - 1];
      updateConversationAfterCreateMessage(
        conversation,
        lastMessage,
        new Types.ObjectId(senderId),
        true,
      );
      await conversation.save();

      if (isFirstMessage) {
        await conversation.populate({
          path: 'participants.userId',
          select: 'name avatarUrl',
        });
        // phát sự kiện new-conversation cho ảnh đầu tiên
        this.socketEventsService.emitNewConversation(
          conversation,
          messages[0],
          recipientId,
          senderId,
        );
        // phát sự kiện new-message cho các ảnh còn lại
        for (let i = 1; i < messages.length; i++) {
          this.socketEventsService.emitNewMessage(conversation, messages[i]);
        }
      } else {
        for (const msg of messages) {
          this.socketEventsService.emitNewMessage(conversation, msg);
        }
      }

      return messages;
    } catch (error) {
      console.error('Error when sending direct image messages:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }

  // gửi ảnh trong tin nhắn nhóm (tối đa 5 ảnh, mỗi ảnh là 1 message riêng)
  async sendGroupImages(
    files: Express.Multer.File[],
    senderId: string,
    conversation: ConversationDocument,
  ) {
    const MAX_IMAGES = 5;
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 ảnh.');
    }
    if (files.length > MAX_IMAGES) {
      throw new BadRequestException(
        `Chỉ được gửi tối đa ${MAX_IMAGES} ảnh cùng lúc.`,
      );
    }

    try {
      // upload tất cả ảnh lên Cloudinary song song
      const uploadResults = await this.cloudinaryService.uploadMultipleImages(
        files,
        'chat-images',
      );

      // tạo từng message riêng biệt cho mỗi ảnh
      const messages = await Promise.all(
        uploadResults.map((img) =>
          this.messageModel.create({
            conversationId: conversation._id,
            senderId: new Types.ObjectId(senderId),
            type: MessageType.IMAGE,
            imgUrl: img.secureUrl,
            imgPublicId: img.publicId,
          }),
        ),
      );

      // cập nhật conversation theo message cuối cùng
      const lastMessage = messages[messages.length - 1];
      updateConversationAfterCreateMessage(
        conversation,
        lastMessage,
        new Types.ObjectId(senderId),
      );
      await conversation.save();

      for (const msg of messages) {
        this.socketEventsService.emitNewMessage(conversation, msg);
      }

      return messages;
    } catch (error) {
      console.error('Error when sending group image messages:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }
}
