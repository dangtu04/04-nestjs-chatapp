import { PartialType } from '@nestjs/mapped-types';
import { CreateAuthDto } from './create-auth.dto';
import { IsNotEmpty } from 'class-validator';

export class UpdateAuthDto extends PartialType(CreateAuthDto) {}

export class ResetPasswordAuthDto {
  @IsNotEmpty()
  code: string;
  @IsNotEmpty()
  password: string;
  @IsNotEmpty()
  confirmPassword: string;
  @IsNotEmpty()
  email: string;
}
