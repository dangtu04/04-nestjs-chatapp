import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SocketWithAuth } from './interfaces/socket-with-auth.interface';
import { OnlineUsersService } from './online-users.service';
import { SocketEventsService } from './socket-events.service';
import { ConversationService } from '@/modules/conversation/conversation.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly onlineUsersService: OnlineUsersService,
    private readonly socketEventsService: SocketEventsService,
    private readonly conversationService: ConversationService,
  ) {}
  afterInit(server: Server) {
    this.socketEventsService.setServer(server);
  }
  async handleConnection(client: SocketWithAuth) {
    // console.log('>>>>>>> Connected');

    const user = client.user;
    const conversationIds =
      await this.conversationService.getUserConversationForSocketIo(user._id);
    conversationIds.forEach((id) => client.join(id));

    this.onlineUsersService.addUserSocket(user._id, client.id);
    // console.log(this.onlineUsersService.getOnlineUserIds());
    this.server.emit(
      'online-users',
      this.onlineUsersService.getOnlineUserIds(),
    );
    // console.log(`>>>>>>> ${client.user.email} - online with id: ${client.id}`);
  }

  handleDisconnect(client: SocketWithAuth) {
    this.onlineUsersService.removeUserSocket(client.user._id, client.id);
    this.server.emit(
      'online-users',
      this.onlineUsersService.getOnlineUserIds(),
    );
    // console.log('>>>>>>> Disconnected');
  }
}
