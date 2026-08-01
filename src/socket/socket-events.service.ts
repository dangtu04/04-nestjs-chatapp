import { ConversationDocument } from '@/modules/conversation/schemas/conversation.schema';
import { MessageDocument } from '@/modules/message/schemas/message.schema';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { OnlineUsersService } from './online-users.service';

@Injectable()
export class SocketEventsService {
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  constructor(private readonly onlineUsersService: OnlineUsersService) {}

  emitNewMessage(conversation: ConversationDocument, message: MessageDocument) {
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

  emitReadMessage(conversation: ConversationDocument) {
    this.server.to(conversation._id.toString()).emit('read-message', {
      conversation: conversation,
      lastMessage: {
        _id: conversation?.lastMessage._id,
        content: conversation?.lastMessage.content,
        createdAt: conversation?.lastMessage.createdAt,
        sender: {
          _id: conversation?.lastMessage.senderId,
        },
      },
    });
  }

  joinConversationMembers(memberIds: string[], conversationId: string) {
    // duyệt qua từng member trong conversation
    for (const userId of memberIds) {
      /**
       * lấy tất cả socket của user
 
       */
      const socketIds = this.onlineUsersService.getUserSocketIds(userId);
      // console.log('>>>>>>>>>>>>>> check socketId: ', socketIds);
      // duyệt qua từng socket của user
      for (const socketId of socketIds) {
        /**
         * Server đang lưu tất cả socket đang kết nối dưới dạng:
         *
         * Map<
         *   socketId,
         *   Socket
         * >
         *
         * nên chỉ cần truyền socketId là lấy được object Socket.
         */
        const socket = this.server.sockets.sockets.get(socketId);
        // console.log('>>>>>>>> check socket: ', socket);
        /**
         * nếu socket vẫn còn tồn tại
         * thì đưa socket này vào room conversation.
         */
        socket?.join(conversationId);
      }
    }
  }

  emitNewConversation(
    conversation: ConversationDocument,
    message: MessageDocument,
    recipientId: string,
    senderId: string,
  ) {
    const participants = (conversation.participants || []).map((p) => {
      const user = p.userId as any;
      return {
        _id: user?._id ?? user,
        name: user?.name,
        avatarUrl: user?.avatarUrl ?? null,
        joinedAt: p.joinedAt,
      };
    });

    const payload = {
      message,
      conversation: {
        _id: conversation._id,
        type: conversation.type,
        participants,
        lastMessage: conversation.lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        unreadCounts: conversation.unreadCounts,
      },
    };

    // emit về cả người nhận lẫn người gửi
    this.server.to(recipientId).emit('new-conversation', payload);
    this.server.to(senderId).emit('new-conversation', payload);
  }

  emitNewGroup(conversation: ConversationDocument, memberIds: string[]) {
    memberIds.forEach((userId) => {
      this.server.to(userId).emit('new-group', { conversation });
    });
  }
}
