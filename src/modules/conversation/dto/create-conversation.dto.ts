import { ConversationType } from '@/enum/conversation.enum';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateConversationDto {
  @IsEnum(ConversationType)
  type: ConversationType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({
    each: true,
  })
  memberIds: string[];
}

export class GetMessageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: 'limit phải là số nguyên.',
  })
  @Min(1, {
    message: 'limit phải lớn hơn 0.',
  })
  @Max(100, {
    message: 'limit tối đa là 100.',
  })
  limit: number = 50;

  @IsOptional()
  // @IsISO8601(
  //   {},
  //   {
  //     message: 'cursor phải là định dạng thời gian ISO.',
  //   },
  // )
  cursor?: string;
}
