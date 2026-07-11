import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Conversation,
  ConversationSchema,
} from '@/modules/conversation/schemas/conversation.schema';
import {
  Message,
  MessageSchema,
} from '@/modules/message/schemas/message.schema';
import { Friend, FriendSchema } from '@/modules/friend/schemas/friend.schema';
import { SocketModule } from '@/socket/socket.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Friend.name, schema: FriendSchema },
    ]),
    SocketModule,
  ],
  controllers: [MessageController],
  providers: [MessageService],
})
export class MessageModule {}
