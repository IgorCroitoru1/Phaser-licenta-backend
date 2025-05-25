import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/user/user.model';

export type TokenDocument = Token & Document;

@Schema({ timestamps: true })
export class Token {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId; // Link to the user

  @Prop({ required: true })
  refreshToken: string; // Store hashed refresh token for security


  @Prop({ default: new Date(), expires: '30d' }) // Auto-delete after 30 days
  createdAt: Date;
}

export const TokenSchema = SchemaFactory.createForClass(Token);
