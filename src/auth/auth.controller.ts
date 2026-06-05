import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Body,
  Version,
  Res,
  Req,
  Get,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { Public } from '@/decorator/customize';
import { LocalAuthGuard } from './guard/local-auth.guard';
import { CreateAuthDto, VerifyAccountDto } from './dto/create-auth.dto';
import { ResetPasswordAuthDto } from './dto/update-auth.dto';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('login')
  @UseGuards(LocalAuthGuard)
  handleLogin(@Req() req) {
    return this.authService.login(req.user);
  }

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @Version('2')
  async handleLoginV2(@Req() req, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(req.user);

    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // tạm fix cứng 7 ngày
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refresh_token, access_token, ...response } = result;
    return { access_token };
  }

  @Post('register')
  @Public()
  register(@Body() registerDto: CreateAuthDto) {
    return this.authService.register(registerDto);
  }

  /*  
  - FE
    người dùng nhấn "đăng nhập bằng google"
      next-auth chuyển hướng đến trang xác thực của google 
      người dùng chọn tài khoản và đồng ý cấp quyền
      google trả về id_token cho next-auth
  
  - next-auth callback jwt
    phát hiện account.provider === "google"
      lấy id_token từ account và gửi lên BE
  
  - BE - verifyGoogleToken
    dùng google-auth-library để xác minh id_token trực tiếp với google
      google xác nhận token hợp lệ và trả về thông tin profile
      kiểm tra email đã được verify chưa
  
  - BE - findOrCreateGoogleUser
    tìm user theo googleId trong db
      nếu có: trả về user luôn
      nếu không có nhưng email đã tồn tại: gắn googleId vào tài khoản cũ rồi trả về
      nếu hoàn toàn mới: tạo tài khoản mới với accountType = google
  
  - BE - loginGoogle
    ký jwt token nội bộ với thông tin user
      trả về { user, access_token } cho next-auth
  
  - next-auth callback jwt tiếp tục
    lưu user và access_token vào jwt token
  
  - next-auth callback session
    đưa thông tin user từ token vào session
  */
  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('login/google')
  handleLoginGoogle(@Body('id_token') id_token: string) {
    return this.authService.loginGoogle(id_token);
  }

  @Post('verify-account')
  @Public()
  verifyAccount(@Body() verifyAccountDto: VerifyAccountDto) {
    return this.authService.verifyAccount(verifyAccountDto);
  }

  @Post('reactivate')
  @Public()
  reactivate(@Body('email') email: string) {
    return this.authService.reactivate(email);
  }

  @Post('forgot-password')
  @Public()
  forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  @Public()
  resetPassword(@Body() resetPasswordAuthDto: ResetPasswordAuthDto) {
    return this.authService.resetPassword(resetPasswordAuthDto);
  }

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('refresh')
  refresh(@Body('refresh_token') refreshToken: string, @Req() req: Request) {
    const refreshTokenFinal = refreshToken ?? req.cookies['refresh_token'];
    return this.authService.refresh(refreshTokenFinal);
  }

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('logout')
  async logout(
    @Body('refresh_token') refreshToken: string,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const refreshTokenFinal = refreshToken ?? req.cookies['refresh_token'];
    const fromCookie = !refreshToken && !!req.cookies['refresh_token'];

    const result = await this.authService.logout(refreshTokenFinal);

    if (fromCookie) {
      res.clearCookie('refresh_token');
    }

    return result;
  }

  @Get('test')
  test() {
    return { message: 'Test endpoint for authentication' };
  }
}
