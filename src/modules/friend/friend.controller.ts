import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { FriendService } from './friend.service';
import { CreateFriendDto, SendFriendRequestDto } from './dto/create-friend.dto';
import { UpdateFriendDto } from './dto/update-friend.dto';
import { Roles } from '@/decorator/customize';
import { UserRole } from '@/enum/user.enum';

@Controller('friend')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  // gửi lời mời kết bạn
  @Post('request')
  @Roles(UserRole.ADMIN, UserRole.USER)
  sendFriendRequest(@Body() dto: SendFriendRequestDto, @Req() req) {
    const senderId = req.user._id;
    return this.friendService.sendFriendRequest(dto, senderId);
  }

  // chấp nhận lời mời kết bạn
  @Post('request/:requestId/accept')
  @Roles(UserRole.ADMIN, UserRole.USER)
  acceptFriendRequest() {
    return 'acceptFriendRequest in controller';
  }

  // từ chối lời mời kết bạn
  @Post('request/:requestId/decline')
  @Roles(UserRole.ADMIN, UserRole.USER)
  declineFriendRequest() {
    return 'declineFriendRequest in controller';
  }

  // lấy danh sách bạn bè
  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER)
  getAllFriends() {
    return this.friendService.getAllFriends();
  }

  // lấy danh sách lời mời kết bạn
  @Get('requests')
  @Roles(UserRole.ADMIN, UserRole.USER)
  getFriendRequests() {
    return this.friendService.getFriendRequests();
  }
}
