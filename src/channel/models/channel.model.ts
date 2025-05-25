import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RolesEnum, RolesEnumType } from 'src/user/constants/roles.constant';
import { User } from 'src/user/user.model';
import { Scene } from './scene.model';

export type ChannelDocument = Channel & Document;

@Schema({ timestamps: true })
export class Channel {
   @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  mapName: string; // References a map file in /public/maps/

  @Prop({ required: true, default: 30 })
  maxUsers: number;

  @Prop({ required: true, default: true })
  isActive: boolean;
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  createdBy: Types.ObjectId; // Admin user ID
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);
