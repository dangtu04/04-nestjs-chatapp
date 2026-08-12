import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsNotEmpty()
  @IsMongoId()
  recipientId: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsMongoId()
  conversationId?: string;
}

export class CreateGroupMessageDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsMongoId()
  conversationId: string;
}

// DTO gửi ảnh tin nhắn đơn
export class SendDirectImageDto {
  @IsNotEmpty()
  @IsMongoId()
  recipientId: string;

  @IsOptional()
  @IsMongoId()
  conversationId?: string;
}

// DTO gửi ảnh tin nhắn nhóm
export class SendGroupImageDto {
  @IsNotEmpty()
  @IsMongoId()
  conversationId: string;
}
