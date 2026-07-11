import { UserRole } from '@/enum/user.enum';
import { Socket } from 'socket.io';

export interface JwtPayload {
  _id: string;
  email: string;
  role: UserRole;
}

export interface SocketWithAuth extends Socket {
  user: JwtPayload;
}
