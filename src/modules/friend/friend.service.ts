import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SendFriendRequestDto } from './dto/create-friend.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Friend } from './schemas/friend.schema';
import { Model, Types } from 'mongoose';
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

    const userA = new Types.ObjectId(senderId);
    const userB = new Types.ObjectId(to);

    const [alreadyFriends, existingRequest] = await Promise.all([
      this.friendModel.findOne({
        $or: [
          { userA, userB },
          { userA: userB, userB: userA },
        ],
      }),
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
  async acceptFriendRequest(requestId: string, userId: string) {
    const request = await this.friendRequestModel.findById(requestId);

    // check tồn tại lời mời
    if (!request) {
      throw new NotFoundException('Không tìm thấy lời mời kết bạn.');
    }

    // check người chấp nhận lời mời
    if (request.to.toString() !== userId) {
      throw new BadRequestException('Bạn không có quyền chấp nhận lời mời.');
    }
    try {
      await this.friendModel.create({
        userA: new Types.ObjectId(request.from),
        userB: new Types.ObjectId(request.to),
      });

      await this.friendRequestModel.findByIdAndDelete(requestId);

      const from = await this.userModel
        .findById(request.from)
        .select('_id name avatarUrl')
        .lean();

      return {
        newFriend: {
          _id: from?._id,
          name: from?.name,
          avatarUrl: from?.avatarUrl,
        },
      };
    } catch (error) {
      console.log('Error accepting friend request', error);
      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }

  // từ chối lời mời kết bạn
  async declineFriendRequest(requestId: string, userId: string) {
    const request = await this.friendRequestModel.findById(requestId);

    // check tồn tại lời mời
    if (!request) {
      throw new NotFoundException('Không tìm thấy lời mời kết bạn.');
    }

    // check người từ chối lời mời
    if (request.to.toString() !== userId) {
      throw new BadRequestException('Bạn không có quyền từ chối lời mời.');
    }
    try {
      await this.friendRequestModel.findByIdAndDelete(requestId);
    } catch (error) {
      console.log('Error when rejecting friend request', error);
      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }

  // lấy danh sách bạn bè
  async getAllFriends(userId: string) {
    try {
      const friendships = await this.friendModel
        .find({
          $or: [
            { userA: new Types.ObjectId(userId) },
            { userB: new Types.ObjectId(userId) },
          ],
        })
        .populate('userA', '_id name avatarUrl')
        .populate('userB', '_id name avatarUrl')
        .lean();

      if (!friendships.length) {
        return {
          friends: [],
        };
      }
      const friends = friendships.map((friend) =>
        friend.userA._id.toString() === userId.toString()
          ? friend.userB
          : friend.userA,
      );
      return { friends };
    } catch (error) {
      console.log('Error retrieving friend list', error);
      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }

  // lấy danh sách lời mời kết bạn
  async getFriendRequests(userId: string) {
    try {
      const populateFields = '_id name avatarUrl';
      const [sent, received] = await Promise.all([
        this.friendRequestModel
          .find({ from: userId })
          .populate('to', populateFields),
        this.friendRequestModel
          .find({ to: userId })
          .populate('from', populateFields),
      ]);

      return {
        sent,
        received,
      };
    } catch (error) {
      console.log('Error retrieving friend request list', error);
      throw new InternalServerErrorException('Lỗi hệ thống.');
    }
  }
}
