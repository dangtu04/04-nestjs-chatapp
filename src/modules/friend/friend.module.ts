import { Module } from '@nestjs/common';
import { FriendService } from './friend.service';
import { FriendController } from './friend.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Friend, FriendSchema } from './schemas/friend.schema';
import {
  FriendRequest,
  FriendRequestSchema,
} from './schemas/friend.request.schema';
import { User, UserSchema } from '@/modules/users/schemas/user.schema';
import { FriendshipGuard } from '../message/guard/friendship.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Friend.name, schema: FriendSchema },
      { name: FriendRequest.name, schema: FriendRequestSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [FriendController],
  providers: [FriendService, FriendshipGuard],
  exports: [FriendService],
})
export class FriendModule {}
