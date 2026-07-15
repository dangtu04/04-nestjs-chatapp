import { Module, forwardRef } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { Friend, FriendSchema } from '@/modules/friend/schemas/friend.schema';
import {
  Message,
  MessageSchema,
} from '@/modules/message/schemas/message.schema';
import { SocketModule } from '@/socket/socket.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Friend.name, schema: FriendSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    forwardRef(() => SocketModule),
  ],
  controllers: [ConversationController],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule {}
