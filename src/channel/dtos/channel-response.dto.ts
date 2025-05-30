import { Expose, Transform } from "class-transformer";
import { ChannelDocument } from "../models/channel.model";

export class ChannelResponseDto {
  @Expose()
  id: string;
  @Expose()
  name: string;
  @Expose()
  mapName: string;
  @Expose()
  maxUsers: number;
  @Expose()
  isActive: boolean;
  @Expose()
  @Transform(({ obj }) => obj.createdBy.toString())
  createdBy: string;
 
}
