import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFriendDto {}

export class SendFriendRequestDto {
  @IsMongoId()
  to: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  message?: string;
}
