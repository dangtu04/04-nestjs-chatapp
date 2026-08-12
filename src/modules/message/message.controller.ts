import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Body,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MessageService } from './message.service';
import { UserRole } from '@/enum/user.enum';
import { FriendshipBodyKey, MembershipKey, Roles } from '@/decorator/customize';
import {
  CreateGroupMessageDto,
  CreateMessageDto,
  SendDirectImageDto,
  SendGroupImageDto,
} from './dto/create-message.dto';
import { FriendshipGuard } from './guard/friendship.guard';
import { MembershipGuard } from './guard/membership.guard';

@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  // gửi tin nhắn đơn
  @HttpCode(HttpStatus.OK)
  @Post('direct')
  @UseGuards(FriendshipGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @FriendshipBodyKey({ bodyKey: 'recipientId' })
  sendDirectMessage(@Body() dto: CreateMessageDto, @Req() req) {
    const senderId = req.user._id;
    return this.messageService.sendDirectMessage(dto, senderId);
  }

  // gửi tin nhắn nhóm
  @HttpCode(HttpStatus.OK)
  @Post('group')
  @UseGuards(MembershipGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @MembershipKey('conversationId')
  sendGroupMessage(@Body() dto: CreateGroupMessageDto, @Req() req) {
    const senderId = req.user._id;
    const conversation = req.conversation;
    console.log('conversation', conversation);
    return this.messageService.sendGroupMessage(dto, senderId, conversation);
  }

  // gửi ảnh trong tin nhắn đơn (tối đa 5 ảnh, mỗi ảnh = 1 message riêng)
  // recipientId & conversationId truyền qua query string để Guard đọc được trước khi Multer parse body
  @HttpCode(HttpStatus.OK)
  @Post('direct/images')
  @UseGuards(FriendshipGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @FriendshipBodyKey({ bodyKey: 'recipientId' })
  @UseInterceptors(FilesInterceptor('images', 5))
  sendDirectImages(
    @Query() dto: SendDirectImageDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req,
  ) {
    const senderId = req.user._id;
    return this.messageService.sendDirectImages(dto, files, senderId);
  }

  // gửi ảnh trong tin nhắn nhóm (tối đa 5 ảnh, mỗi ảnh = 1 message riêng)
  // conversationId truyền qua query string để Guard đọc được trước khi Multer parse body
  @HttpCode(HttpStatus.OK)
  @Post('group/images')
  @UseGuards(MembershipGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @MembershipKey('conversationId')
  @UseInterceptors(FilesInterceptor('images', 5))
  sendGroupImages(@UploadedFiles() files: Express.Multer.File[], @Req() req) {
    const senderId = req.user._id;
    const conversation = req.conversation;
    return this.messageService.sendGroupImages(files, senderId, conversation);
  }
}
