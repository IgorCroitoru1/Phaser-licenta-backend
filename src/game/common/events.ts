import { Player } from "../schemas/room.schema";
import { ChannelUserDto } from "src/user/dtos/channel-user.dto";

export type Position = {
    x: number;
    y: number;
  };
export enum GameEvents  {
    PLAYER_MOVE = "move",
    PLAYER_JOINED = "player_joined",
    CURRENT_ZONE = "current_zone",
    PLAYER_LEFT = "player_left",
    INIT_USERS = "init_users",
    //ZONE_CHANGED = "zone_changed",
    //DOOR_OPENED = "door_open",
    ZOOM_CHANGE = "zoom_change", // Event name for zoom changes
    DOOR_TRIGGER = "door_trigger", // Event name for door click events
    MESSAGE = "message",
    DOOR_RING = "door_ring",
  }

  export interface ColyseusEventPayloads {
    [GameEvents.PLAYER_MOVE]: Position;
    [GameEvents.DOOR_TRIGGER]: { zoneId: number };
    [GameEvents.PLAYER_JOINED]: ChannelUserDto ;
    [GameEvents.CURRENT_ZONE]: { zoneId: number };
    [GameEvents.INIT_USERS]: ChannelUserDto[];
    [GameEvents.MESSAGE]: { message: string;};
    [GameEvents.DOOR_RING]: { zoneId: number; by: string; };
  }