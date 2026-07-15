import { Module, forwardRef } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { OnlineUsersService } from './online-users.service';
import { SocketEventsService } from './socket-events.service';
import { ConversationModule } from '@/modules/conversation/conversation.module';

@Module({
  imports: [forwardRef(() => ConversationModule)],
  providers: [ChatGateway, OnlineUsersService, SocketEventsService],
  exports: [SocketEventsService],
})
export class SocketModule {}
