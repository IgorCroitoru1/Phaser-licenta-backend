import { ChannelDocument } from "../models/channel.model";

export class ChannelResponseDto {
  id: string;
  name: string;
  mapName: string;
  maxUsers: number;
  isActive: boolean;
  createdBy: string;

  constructor(channel: ChannelDocument) {
    this.id = channel._id || channel.id;
    this.name = channel.name;
    this.mapName = channel.mapName;
    this.maxUsers = channel.maxUsers;
    this.isActive = channel.isActive;
    this.createdBy = channel.createdBy.toString(); // Assuming createdBy is a Types.ObjectId
  }
}
