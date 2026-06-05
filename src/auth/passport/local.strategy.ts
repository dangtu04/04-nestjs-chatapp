import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    // By default passport-local looks for a field named 'username' in the request body.
    // Set usernameField to 'email' so the strategy reads 'email' instead.
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<any> {
    // console.log('>>> check: ', email, password);
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.isActive === false) {
      throw new BadRequestException('Account not activated');
    }
    return user;
  }
}
