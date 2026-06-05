import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
  @IsOptional()
  name: string;
  @IsNotEmpty()
  password: string;
}

export class VerifyAccountDto {
  @IsNotEmpty()
  _id: string;
  @IsOptional()
  code: string;
}
