import { Controller, Get } from '@nestjs/common';
import { MailService } from './mail.service';
import { Public } from '@/decorator/customize';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('test-mail')
  @Public()
  testMail() {
    return this.mailService.testMail();
  }
}
