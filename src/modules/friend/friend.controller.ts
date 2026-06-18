import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FriendService } from './friend.service';
import { SendFriendRequestDto } from './dto/create-friend.dto';
import { ResponseMessage, Roles } from '@/decorator/customize';
import { UserRole } from '@/enum/user.enum';

@Controller('friend')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  // gửi lời mời kết bạn
  @Post('request')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ResponseMessage('Gửi lời mời kết bạn thành công.')
  sendFriendRequest(@Body() dto: SendFriendRequestDto, @Req() req) {
    const senderId = req.user._id;
    return this.friendService.sendFriendRequest(dto, senderId);
  }

  // chấp nhận lời mời kết bạn
  @Post('request/:requestId/accept')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ResponseMessage('Chấp nhận lời mời kết bạn thành công.')
  acceptFriendRequest(@Param('requestId') requestId: string, @Req() req) {
    const userId = req.user._id;
    return this.friendService.acceptFriendRequest(requestId, userId);
  }

  // từ chối lời mời kết bạn
  @HttpCode(HttpStatus.OK)
  @Post('request/:requestId/decline')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ResponseMessage('Từ chối lời mời kết bạn thành công.')
  declineFriendRequest(@Param('requestId') requestId: string, @Req() req) {
    const userId = req.user._id;
    return this.friendService.declineFriendRequest(requestId, userId);
  }

  // lấy danh sách bạn bè
  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER)
  getAllFriends(@Req() req) {
    const userId = req.user._id;
    return this.friendService.getAllFriends(userId);
  }

  // lấy danh sách lời mời kết bạn
  @Get('requests')
  @Roles(UserRole.ADMIN, UserRole.USER)
  getFriendRequests(@Req() req) {
    const userId = req.user._id;
    return this.friendService.getFriendRequests(userId);
  }
}
