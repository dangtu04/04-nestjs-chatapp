import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SendFriendRequestDto } from './dto/create-friend.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Friend } from './schemas/friend.schema';
import { Model } from 'mongoose';
import { User } from '@/modules/users/schemas/user.schema';
import { FriendRequest } from './schemas/friend.request.schema';

@Injectable()
export class FriendService {
  constructor(
    @InjectModel(Friend.name) private friendModel: Model<Friend>,
    @InjectModel(FriendRequest.name)
    private friendRequestModel: Model<FriendRequest>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}
  // 6a107555e44f6ec0759edff0
  // 6a1f01ed521dd92eea12420c
  // gửi lời mời kết bạn
  async sendFriendRequest(dto: SendFriendRequestDto, senderId: string) {
    const { to, message } = dto;

    // check có tự gửi cho mình không
    if (to === senderId) {
      throw new BadRequestException(
        'Bạn không thể gửi lời mời kết bạn cho chính mình.',
      );
    }

    // check user có tồn tại không
    const userExists = await this.userModel.exists({ _id: to });
    if (!userExists) {
      throw new NotFoundException('Người nhận không tồn tại');
    }

    let userA = senderId.toString();
    let userB = to.toString();

    if (userA > userB) {
      [userA, userB] = [userB, userA];
    }
    const [alreadyFriends, existingRequest] = await Promise.all([
      this.friendModel.findOne({ userA, userB }),
      this.friendRequestModel.findOne({
        $or: [
          { from: senderId, to },
          { from: to, to: senderId },
        ],
      }),
    ]);

    if (alreadyFriends) {
      throw new BadRequestException('Hai người đã là bạn bè.');
    }
    if (existingRequest) {
      throw new BadRequestException('Đã có lời mời kết bạn.');
    }
    try {
      const request = await this.friendRequestModel.create({
        from: senderId,
        to,
        message,
      });
      return request;
    } catch (error) {
      console.log('Error sending friend request', error);
      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }

  // chấp nhận lời mời kết bạn
  async acceptFriendRequest() {
    try {
    } catch (error) {
      console.log('Error accepting friend request', error);
      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }

  // từ chối lời mời kết bạn
  async declineFriendRequest() {
    try {
    } catch (error) {
      console.log('Error when rejecting friend request', error);
      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }

  // lấy danh sách bạn bè
  async getAllFriends() {
    try {
    } catch (error) {
      console.log('Error retrieving friend list', error);
      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }

  // lấy danh sách lời mời kết bạn
  async getFriendRequests() {
    try {
    } catch (error) {
      console.log('Error retrieving friend request list', error);
      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }
}
