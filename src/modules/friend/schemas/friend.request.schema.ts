import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FriendRequestDocument = HydratedDocument<FriendRequest>;

@Schema({
  timestamps: true,
})
export class FriendRequest {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  from: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  to: Types.ObjectId;

  @Prop({
    type: String,
    maxlength: 300,
  })
  message: string;
}
export const FriendRequestSchema = SchemaFactory.createForClass(FriendRequest);

FriendRequestSchema.index(
  {
    from: 1,
    to: 1,
  },
  { unique: true },
);

FriendRequestSchema.index({ from: 1 });

FriendRequestSchema.index({ to: 1 });
