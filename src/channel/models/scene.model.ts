import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RolesEnum, RolesEnumType } from 'src/user/constants/roles.constant';
import { User } from 'src/user/user.model';

export type ZoneType = {
    x: number;
    y: number;
    width: number;
    height: number;
    accessRoles: RolesEnumType[];
    isLocked: boolean;
    lockedBy: string | null
};
export type SceneDocument = Scene & Document;

@Schema({ timestamps: true })
export class Scene {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  sceneKey: string;

  @Prop({ required: true })
  tilemapPath: string;

  @Prop({ required: true })
  tilemapImages: string[];

  @Prop({ 
    type: [
        { 
            x: Number, 
            y: Number, 
            width: Number, 
            height: Number, 
            accessRoles: {type: [String], enum: Object.values(RolesEnum), default: []},
            isLocked: { type: Boolean, default: false },
            lockedBy: { type: Types.ObjectId, ref: User.name, default: null }, 
        }
    ]
    })
  zones: ZoneType[];

  @Prop({ type: Map, of: Boolean })
  doorsState: Map<string, boolean>;
}

export const SceneSchema = SchemaFactory.createForClass(Scene);
