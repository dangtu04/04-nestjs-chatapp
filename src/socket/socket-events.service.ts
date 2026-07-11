import { ConversationDocument } from '@/modules/conversation/schemas/conversation.schema';
import { MessageDocument } from '@/modules/message/schemas/message.schema';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class SocketEventsService {
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  emitNewMessage(conversation: ConversationDocument, message: MessageDocument) {
    // console.log('>>>>>>>>>>> emited');
    // console.log('>>>>>>>>> check conversation: ', conversation);
    // console.log('>>>>>>>>> check message: ', message);
    this.server.to(conversation._id.toString()).emit('new-message', {
      message,
      conversation: {
        _id: conversation._id,
        lastMessage: conversation.lastMessage,
        lastMessageAt: conversation.lastMessageAt,
      },
      unreadCounts: conversation.unreadCounts,
    });
  }
}
