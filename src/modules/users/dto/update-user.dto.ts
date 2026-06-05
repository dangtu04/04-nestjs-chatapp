import { UserRole } from '@/enum/user.enum';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  name?: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  address?: string;

  @IsOptional()
  role?: UserRole;

  @IsOptional()
  isActive?: boolean;
}

// DTO cho Address (dùng chung)
export class AddressDto {
  @IsNumber()
  @IsNotEmpty()
  provinceCode: number;

  @IsString()
  @IsNotEmpty()
  provinceName: string;

  @IsNumber()
  @IsNotEmpty()
  wardCode: number;

  @IsString()
  @IsNotEmpty()
  wardName: string;

  @IsOptional()
  @IsString()
  detail?: string;
}
// DTO cho user thường update profile
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Tên phải có ít nhất 2 ký tự' })
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(0|\+84)[0-9]{9,10}$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}
