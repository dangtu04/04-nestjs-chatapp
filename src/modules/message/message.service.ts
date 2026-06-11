import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { InjectModel } from '@nestjs/mongoose';
import {
  Conversation,
  ConversationDocument,
} from '../conversation/schemas/conversation.schema';
import { Model, Types } from 'mongoose';
import { Message } from './schemas/message.schema';
import { updateConversationAfterCreateMessage } from '@/helpers/message';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    @InjectModel(Message.name)
    private messageModel: Model<Message>,
  ) {}
  async sendDirectMessage(dto: CreateMessageDto, senderId: string) {
    const { recipientId, content, conversationId } = dto;

    if (!content) {
      throw new BadRequestException('Thiếu nội dung');
    }
    let conversation: ConversationDocument;
    try {
      if (!conversationId) {
        conversation = await this.conversationModel.create({
          type: 'direct',
          participants: [
            { userId: senderId, joinedAt: new Date() },
            { userId: recipientId, joinedAt: new Date() },
          ],
          lastMessageAt: new Date(),
          unreadCounts: new Map(),
        });
      }

      const message = await this.messageModel.create({
        conversationId: conversation._id,
        senderId,
        content,
      });

      updateConversationAfterCreateMessage(
        conversation,
        message,
        new Types.ObjectId(senderId),
      );
      await conversation.save();

      return message;
    } catch (error) {
      console.log('Error when sending direct messages', error);
      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }

  async sendGroupMessage() {
    try {
    } catch (error) {
      console.log('Error when sending group messages', error);
      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }
}
