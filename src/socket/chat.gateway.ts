import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SocketWithAuth } from './interfaces/socket-with-auth.interface';
import { OnlineUsersService } from './online-users.service';
import { SocketEventsService } from './socket-events.service';
import { ConversationService } from '@/modules/conversation/conversation.service';
import { UsersService } from '@/modules/users/users.service';

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
    private readonly userService: UsersService,
  ) {}
  afterInit(server: Server) {
    this.socketEventsService.setServer(server);
  }

  @SubscribeMessage('join-conversation')
  handleJoinConversation(client: SocketWithAuth, conversationId: string) {
    client.join(conversationId);
  }

  async handleConnection(client: SocketWithAuth) {
    // console.log('>>>>>>> Connected');

    const user = client.user;
    const conversationIds =
      await this.conversationService.getUserConversationForSocketIo(user._id);
    conversationIds.forEach((id) => client.join(id));

    client.join(user._id.toString());

    this.onlineUsersService.addUserSocket(user._id, client.id);

    const onlineUserIds = this.onlineUsersService.getOnlineUserIds();

    // lọc ra các user cho phép hiện trạng thái hoạt động
    const visibleOnlineUserIds =
      await this.userService.getVisibleOnlineUserIds(onlineUserIds);

    this.server.emit('online-users', visibleOnlineUserIds);
  }

  async handleDisconnect(client: SocketWithAuth) {
    this.onlineUsersService.removeUserSocket(client.user._id, client.id);

    const onlineUserIds = this.onlineUsersService.getOnlineUserIds();

    const visibleOnlineUserIds =
      await this.userService.getVisibleOnlineUserIds(onlineUserIds);

    this.server.emit('online-users', visibleOnlineUserIds);
  }
}
