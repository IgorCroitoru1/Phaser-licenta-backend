import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RolesEnum, RolesEnumType } from './constants/roles.constant';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: false })
  fullName?: string;

  @Prop({ unique: true, required: true }) // Not required for OAuth users
  email: string;

  @Prop({ select: false }) // Hide password for security
  password?: string;

  @Prop({ unique: true, sparse: true }) // Only set if using Google OAuth
  googleId?: string;

  @Prop({ required: false })
  avatar?: string; // URL to user's avatar image

 

  @Prop({ type: [String], enum: Object.values(RolesEnum), default: [RolesEnum.USER] }) // Default role: 'user'
  roles: RolesEnumType[];
}

export const UserSchema = SchemaFactory.createForClass(User);
