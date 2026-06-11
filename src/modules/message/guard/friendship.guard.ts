import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FRIENDSHIP_BODY_KEY } from '@/decorator/customize';
import { InjectModel } from '@nestjs/mongoose';
import { Friend } from '@/modules/friend/schemas/friend.schema';
import { Model, Types } from 'mongoose';

@Injectable()
export class FriendshipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(Friend.name) private readonly friendModel: Model<Friend>,
  ) {}

  pair(a: string, b: string): string[] {
    return a < b ? [a, b] : [b, a];
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const bodyKey =
      this.reflector.get<string>(FRIENDSHIP_BODY_KEY, context.getHandler()) ??
      'recipientId';

    const request = context.switchToHttp().getRequest();
    const currentUserId: string = request.user?.userId ?? request.user?._id;
    const targetUserId: string = request.body?.[bodyKey];

    if (!currentUserId || !targetUserId) {
      throw new BadRequestException('Không tìm thấy người dùng.');
    }
    if (
      !Types.ObjectId.isValid(currentUserId) ||
      !Types.ObjectId.isValid(targetUserId)
    ) {
      throw new BadRequestException('Sai định dạng');
    }

    const [userA, userB] = this.pair(currentUserId, targetUserId);
    const isFriend = await this.friendModel.exists({
      userA: userA,
      userB: userB,
    });
    if (!isFriend) {
      throw new ForbiddenException('Bạn chưa kết bạn với người dùng này.');
    }
    return true;
  }
}
