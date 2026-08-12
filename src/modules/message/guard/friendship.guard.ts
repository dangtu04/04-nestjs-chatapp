import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FRIENDSHIP_BODY_KEY, FriendshipOptions } from '@/decorator/customize';
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
    const options = this.reflector.get<FriendshipOptions>(
      FRIENDSHIP_BODY_KEY,
      context.getHandler(),
    ) ?? {
      bodyKey: 'recipientId',
      isArray: false,
    };
    const request = context.switchToHttp().getRequest();
    const currentUserId: string = request.user?.userId ?? request.user?._id;
    const target =
      request.query?.[options.bodyKey] ?? request.body?.[options.bodyKey];

    // nếu bodyKey không là mảng
    if (!options.isArray) {
      const targetUserId = target;
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
        userA: new Types.ObjectId(userA),
        userB: new Types.ObjectId(userB),
      });
      if (!isFriend) {
        throw new ForbiddenException('Bạn chưa kết bạn với người dùng này.');
      }
      return true;
    }
    // nếu bodyKey là mảng
    if (options.isArray) {
      const memberIds: string[] = target;
      if (!memberIds.length) {
        throw new BadRequestException('Nhóm phải có ít nhất 1 thành viên.');
      } else {
        const friendChecks = memberIds.map(async (memberId) => {
          const [userA, userB] = this.pair(currentUserId, memberId);
          const isFriend = await this.friendModel.exists({
            userA: new Types.ObjectId(userA),
            userB: new Types.ObjectId(userB),
          });
          return isFriend ? null : memberId;
        });
        const results = await Promise.all(friendChecks);
        const notFriends = results.filter(Boolean);
        if (notFriends.length > 0) {
          throw new ForbiddenException({
            message: 'Bạn chỉ có thể thêm bạn bè vào nhóm.',
            error: 'Forbidden',
            statusCode: 403,
            data: {
              notFriends,
            },
          });
        }
      }
      return true;
    }
  }
}
