import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { UserDto } from '../../user/dtos/user.dto';
import { ChannelUserDto } from 'src/user/dtos/channel-user.dto';

export interface ChannelLiveData {
  channelId: string;
  clientsCount: number;
  roomsCount: number;
  isActive: boolean;
  metadata?: any;
}

export interface ChannelUpdate {
  channelId: string;
  data: ChannelLiveData;
}

export interface UserCounts {
  [channelId: string]: number;
}

// Event payload DTOs
// export class RoomJoinPayload {
//   @IsString()
//   room: string;
// }

// export class RoomJoinedInitPayload {
//   @IsString()
//   room: string;

//   @IsString()
//   userId: string;

//   roomUsers: UserDto[];
// }

// export class RoomJoinErrorPayload {
//   @IsString()
//   message: string;
// }

// export class UserJoinedPayload {
//   @IsString()
//   userId: string;

//   @IsString()
//   room: string;
// }

// export class UserLeftPayload {
//   @IsString()
//   userId: string;

//   @IsString()
//   room: string;
// }

// export class RoomMessagePayload {
//   @IsString()
//   userId: string;

//   @IsString()
//   room: string;

//   @IsString()
//   message: string;

//   @IsString()
//   messageType: string;

//   @IsDateString()
//   timestamp: string;
// }

// export class LiveKitTokenRequestPayload {
//   @IsString()
//   room: string;
// }

// export class LiveKitTokenPayload {
//   @IsString()
//   token: string;
// }

export class ChannelUserLeftResponse {
  @IsString()
  userId: string;

  @IsString()
  channelId: string;
}
export class ChannelUserJoinResponse {
  @IsString()
  user: ChannelUserDto;

  @IsString()
  channelId: string;
}
// Room management types
export interface ChannelJoinRequest {
  channelId: string;
  metadata?: any;
}
export interface ChannelLeaveRequest {
  channelId: string;
}
export interface ChannelJoinResponse {
  success: boolean;
  users: ChannelUserDto[];
  channelId: string;
  livekitToken?: string;
  livekitUrl?: string;
  error?: string;
}

export interface ChannelLeftResponse {
  success: boolean;
  channelId: string;
  error?: string;
}

export interface LiveKitTokenRequest {
  channelId: string;
  identity?: string;
  metadata?: any;
}

export interface LiveKitTokenResponse {
  token: string;
  channelId: string;
  error?: string
}