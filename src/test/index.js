import { Server } from 'socket.io';
import http from 'http';
import express from 'express';

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

// io.on(socketAuthMiddleware) // middleware để verify token
const onlineUsers = new Map(); // { userId, socketId }

io.on('connection', async (socket) => {
  const user = socket.user;

  onlineUsers.set(user._id, socket.id);

  io.emit('online-user', Array.from(onlineUsers.keys()));

  const conversationIds = await getUserConversationForSocketIo(user._id);
  conversationIds.forEach((id) => {
    socket.join(id);
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(user._id);
    io.emit('online-user', Array.from(onlineUsers.keys()));

    console.log('socket disconnected: ', socket.id);
  });
});

export { io, app, server };

export const emitNewMessage = (io, conversation, message) => {
  io.to(conversation._id.toString()).emit('new-message', {
    message,
    conversation: {
      _id: conversation._id,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
    },
    unreadCounts: conversation.unreadCounts,
  });
};
