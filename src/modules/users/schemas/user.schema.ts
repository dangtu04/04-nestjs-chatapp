import { AccountType, UserRole } from '@/enum/user.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

// Sub-schema cho địa chỉ
@Schema({ _id: false })
export class Address {
  @Prop({ required: true })
  provinceCode: number;

  @Prop({ required: true, trim: true })
  provinceName: string;

  @Prop({ required: true })
  wardCode: number;

  @Prop({ required: true, trim: true })
  wardName: string;

  @Prop({ trim: true })
  detail?: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop()
  password: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ type: AddressSchema, default: null })
  address?: Address;

  @Prop({
    default: null,
  })
  image?: string;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Prop({
    type: String,
    enum: AccountType,
    default: AccountType.LOCAL,
  })
  accountType: AccountType;

  @Prop({
    default: null,
  })
  googleId?: string;

  @Prop({
    default: false,
  })
  isActive: boolean;

  // mã kích hoạt / reset password
  @Prop({
    default: null,
  })
  codeId?: string;

  @Prop({
    default: null,
  })
  codeExpired?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
