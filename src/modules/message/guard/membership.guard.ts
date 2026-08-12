import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MEMBERSHIP_KEY } from '@/decorator/customize';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation } from '@/modules/conversation/schemas/conversation.schema';

@Injectable()
export class MembershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key =
      this.reflector.get<string>(MEMBERSHIP_KEY, context.getHandler()) ??
      'conversationId';

    const request = context.switchToHttp().getRequest();
    const userId: string = request.user?.userId ?? request.user?._id;
    const conversationId = request.query?.[key] ?? request.body?.[key];

    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new BadRequestException('Không tìm thấy cuộc trò chuyện.');
    }
    const isMember = conversation.participants.some(
      (p) => p.userId.toString() === userId.toString(),
    );
    if (!isMember) {
      throw new ForbiddenException('Bạn không ở trong nhóm này.');
    }
    request.conversation = conversation;
    return true;
  }
}
