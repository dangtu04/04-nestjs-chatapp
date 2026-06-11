import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { UserRole } from '@/enum/user.enum';
import { FriendshipBodyKey, Roles } from '@/decorator/customize';
import { CreateMessageDto } from './dto/create-message.dto';
import { FriendshipGuard } from './guard/friendship.guard';

@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  // gửi tin nhắn đơn
  @HttpCode(HttpStatus.OK)
  @Post('direct')
  @UseGuards(FriendshipGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @FriendshipBodyKey('recipientId')
  sendDirectMessage(@Body() dto: CreateMessageDto, @Req() req) {
    const senderId = req.user._id;
    return this.messageService.sendDirectMessage(dto, senderId);
  }

  // gửi tin nhắn nhóm
  @HttpCode(HttpStatus.OK)
  @Post('group')
  @Roles(UserRole.ADMIN, UserRole.USER)
  sendGroupMessage() {
    return this.messageService.sendGroupMessage();
  }
}
