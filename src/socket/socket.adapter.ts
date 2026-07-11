import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { JwtService } from '@nestjs/jwt';
import { ServerOptions, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { SocketWithAuth } from './interfaces/socket-with-auth.interface';

export class SocketAdapter extends IoAdapter {
  private readonly jwtService: JwtService;
  private readonly configService: ConfigService;

  constructor(app: INestApplicationContext) {
    super(app);

    /**
     * vì Adapter ko phải provider nên phải tự lấy dependency từ app
     */
    this.jwtService = app.get(JwtService);
    this.configService = app.get(ConfigService);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    /**
     * tạo socket io server mặc định của nestjs
     */
    const io = super.createIOServer(port, options);
    /**
     * socket io middleware
     *
     * chạy trước handleConnection().
     */
    io.use((socket: Socket, next) => {
      try {
        const token = socket.handshake.auth?.token;

        if (!token) {
          return next(new Error('Unauthorized'));
        }
        /**
         * verify jwt
         */
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
        /**
         * gắn thông tin user vào socket
         * client.user
         */
        (socket as SocketWithAuth).user = payload;

        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });

    return io;
  }
}
