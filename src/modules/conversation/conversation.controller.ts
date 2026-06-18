import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { FriendshipBodyKey, Roles } from '@/decorator/customize';
import { UserRole } from '@/enum/user.enum';
import {
  CreateConversationDto,
  GetMessageQueryDto,
} from './dto/create-conversation.dto';
import { FriendshipGuard } from '@/modules/message/guard/friendship.guard';

@Controller('conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  @UseGuards(FriendshipGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @FriendshipBodyKey({ bodyKey: 'memberIds', isArray: true })
  createConversation(@Body() dto: CreateConversationDto, @Req() req) {
    const userId = req.user._id;
    return this.conversationService.createConversation(dto, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER)
  getConversation(@Req() req) {
    const userId = req.user._id;
    return this.conversationService.getConversation(userId);
  }

  @Get(':conversationId/message')
  @Roles(UserRole.ADMIN, UserRole.USER)
  getMessage(
    @Param('conversationId') conversationId: string,
    @Query() query: GetMessageQueryDto,
    @Req() req,
  ) {
    const reqSenderId = req.user._id;
    return this.conversationService.getMessage(
      conversationId,
      query.limit,
      query.cursor,
      reqSenderId,
    );
  }
}
