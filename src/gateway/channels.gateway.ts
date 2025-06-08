import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  Injectable,
  Logger,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { GameService, ChannelLiveData } from '../game/game.service';
import {
  CHANNEL_EVENTS,
  AllChannelsUpdateEvent,
  ChannelUpdateEvent,
} from '../game/events/channel.events';
import { SOCKET_EVENTS } from './constants';
import { UserDto } from '../user/dtos/user.dto';
import { ChannelRoomService } from './channel-room.service';
import { LivekitService } from '../livekit/livekit.service';
import {
  ChannelJoinRequest,
  ChannelJoinResponse,
  ChannelLeaveRequest,
  ChannelLeftResponse,
  ChannelUserJoinResponse,
  ChannelUserLeftResponse,
  LiveKitTokenRequest,
  LiveKitTokenResponse
} from './dtos/socket-events.dto';
import { User } from 'src/user/user.model';
import { ChannelUserDto } from 'src/user/dtos/channel-user.dto';

// Interface for authenticated socket
interface AuthenticatedSocket extends Socket {
  user?: UserDto;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    // credentials: true,
  },
  namespace: '/channels',
})
export class ChannelsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChannelsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    // private readonly gameService: GameService,
    private readonly channelRoomService: ChannelRoomService,
    private readonly livekitService: LivekitService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }
  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    try {
      // Extract token from handshake auth or query
      const token =
        client.handshake.auth?.token || client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      const user = payload as UserDto;
      // Get full user data
      // const user = await this.userService.findById(payload.sub || payload.id);
      if (!user) {
        this.logger.warn(`Connection rejected: User not found`);
        client.disconnect();
        return;
      }

      // Attach user to socket
      client.user = user;

      this.logger.log(
        `Client connected: ${client.user.name} (${client.user.email})`,
      );

      // Send initial channel data
      const channelsData: ChannelLiveData[] =  this.channelRoomService.getChannelsLiveData();
      client.emit(SOCKET_EVENTS.CHANNELS_UPDATE, channelsData);
    } catch (error) {
      this.logger.warn(`Connection rejected: Invalid token - ${error.message}`);
      client.disconnect();
    }
  }
  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      this.logger.log(
        `Client disconnected: ${client.user.name} (${client.user.email})`,
      );

      // Handle leaving all rooms
      const leftRooms = this.channelRoomService.handleDisconnect(client.id);

      // Notify other users in rooms that this user left
      leftRooms.forEach(({ channelId, user, userLeftRoom }) => {
        if (userLeftRoom) {
          const userLeftPayload: ChannelUserLeftResponse = {
            userId: user.id,
            channelId,
          };

          // Leave the Socket.IO room and broadcast to remaining users
          client.leave(channelId);
          this.server
            .to(channelId)
            .emit(SOCKET_EVENTS.USER_LEFT, userLeftPayload);

          this.logger.debug(
            `User ${user.name} left channel ${channelId} on disconnect`,
          );
        }
      });

      // Update channel statistics
      this.broadcastAllChannelsUpdate();
    } else {
      this.logger.log('Unauthenticated client disconnected');
    }
  }

  // WebSocket message handlers
  // @UsePipes(ValidationPipe)
  @SubscribeMessage(SOCKET_EVENTS.JOIN_CHANNEL)
  async handleJoinChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ChannelJoinRequest,
  ): Promise<ChannelJoinResponse> {
    const response: ChannelJoinResponse = {
      error: null,
      success: true,
      users: [],
      channelId: payload.channelId,
      livekitToken: null,
    }
    try {
      console.log('handleJoinChannel', payload);

      if (!client.user) {
        response.error = 'User not authenticated';
        response.success = false;

        return response 
      }
      const {  channelId } = payload;

      // // Validate that channel exists
      // const channelData = this.getRoomInfo(channelId);
      // if (!channelData) {
      //   response.error = `Channel ${channelId} does not exist`;
      //   response.success = false;
      //   return response 
      // }

      // Check if user is already in this room
      if (this.channelRoomService.isUserInRoom(channelId, client.user.id)) {
        // User is already in this room, just send confirmation
        // const usersInRoom = this.channelRoomService.getUsersInRoom(channelId);
        response.error = "User already in channel";
        response.success = false;
        return response;
      }

      // Leave all other rooms first (single room policy)
      const leftRooms = this.channelRoomService.leaveAllRoomsForUser(
        client.user.id,
      );

      // Notify users in previous rooms that this user left
      for (const { channelId: leftChannelId } of leftRooms) {
        const userLeftPayload: ChannelUserLeftResponse = {
          userId: client.user.id,
          channelId: leftChannelId,
        };

        // Use Socket.IO room broadcasting
        client.leave(leftChannelId);
        this.server
          .to(leftChannelId)
          .emit(SOCKET_EVENTS.USER_LEFT, userLeftPayload);

        // Update channel statistics for left room
        await this.broadcastChannelUpdate(leftChannelId);

        this.logger.debug(
          `User ${client.user.name} left channel ${leftChannelId} to join ${channelId}`,
        );
      }

      // Join the new channel room
      const isNewUser = this.channelRoomService.joinRoom(
        channelId,
        client.id,
        client.user,
      );
      

      // Join the Socket.IO room
      client.join(channelId);

      // Send confirmation to joining user
     

      // If this is a new user (not just additional socket), notify others
      if (isNewUser) {
        const userJoinedPayload: ChannelUserJoinResponse = {
          user: new ChannelUserDto(
            client.user.id,
            client.user.email,
            client.user.name,
            client.user.avatar),
          channelId,
        };

        // Use Socket.IO room broadcasting (exclude the joining user)
        client.to(channelId).emit(SOCKET_EVENTS.USER_JOINED, userJoinedPayload);

        this.logger.debug(
          `User ${client.user.name} joined channel ${channelId}`,
        );
      }
      const livekitToken = await this.livekitService.generateToken(client.user.id, channelId, client.user.name)
      // Update channel statistics
      await this.broadcastChannelUpdate(channelId);
      const usersInRoom = this.channelRoomService.getUsersInRoom(channelId);
      response.users = usersInRoom.map(user => new ChannelUserDto(user.id, user.email, user.name, user.avatar))
      response.success = true;
      response.livekitToken = livekitToken;
      return response;
    } catch (error) {
      this.logger.error(`Error joining channel:`, error);
      response.error = `Failed to join channel`;
      response.success = false;
      return response
    }
  }
  @SubscribeMessage(SOCKET_EVENTS.LEAVE_CHANNEL)
  @UsePipes(ValidationPipe)
  async handleLeaveChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ChannelLeaveRequest,
  ): Promise<ChannelLeftResponse> {
    const channelLeftResponse: ChannelLeftResponse = {
      success: false,
      channelId: payload.channelId,
      error: null,
    }
    try {
      if (!client.user) {
        channelLeftResponse.error = 'User not authenticated';
        return channelLeftResponse;
      }

      const { channelId } = payload;
      const { user, userLeftRoom } = this.channelRoomService.leaveRoom(
        channelId,
        client.id,
      );

      if (user && userLeftRoom) {
        const userLeftPayload: ChannelUserLeftResponse = {
          userId: user.id,
          channelId,
        };

        // Leave the Socket.IO room
        client.leave(channelId);

        // Use Socket.IO room broadcasting
        client
          .to(channelId)
          .emit(SOCKET_EVENTS.USER_LEFT, userLeftPayload);

        this.logger.debug(`User ${user.name} left channel ${channelId}`);

        // Update channel statistics
        await this.broadcastChannelUpdate(channelId);
        channelLeftResponse.success = true;
        channelLeftResponse.channelId = channelId;
        channelLeftResponse.error = null;
        return channelLeftResponse;
      }
    } catch (error) {
      this.logger.error(`Error leaving channel:`, error);
      channelLeftResponse.error = `Failed to leave channel`;
      channelLeftResponse.success = false;
      return channelLeftResponse;
    }
  }
  @SubscribeMessage(SOCKET_EVENTS.CHANNEL_MESSAGE)
  // @UsePipes(ValidationPipe)
  async handleChannelMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: any,
  ): Promise<any> {
    console.log('handleChannelMessage', payload);
    try {
      if (!client.user) {
        return;
      }

      // Verify user is in the room
      if (!this.channelRoomService.isUserInRoom(payload.room, client.user.id)) {
        this.logger.warn(
          `User ${client.user.name} tried to send message to room ${payload.room} they're not in`,
        );
        return;
      }

      // Create message payload with user info
      const messagePayload: any = {
        ...payload,
        userId: client.user.id,
        timestamp: new Date().toISOString(),
      };

      // Broadcast message to all users in the room using Socket.IO rooms
      this.server
        .to(payload.room)
        .emit(SOCKET_EVENTS.CHANNEL_MESSAGE, messagePayload);

      this.logger.debug(
        `Message sent in channel ${payload.room} by ${client.user.name}`,
      );
    } catch (error) {
      this.logger.error(`Error handling channel message:`, error);
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.REQUEST_LIVEKIT_TOKEN)
  @UsePipes(ValidationPipe)
  async handleLiveKitTokenRequest(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: LiveKitTokenRequest,
  ): Promise<LiveKitTokenResponse> {
    const tokenResponse: LiveKitTokenResponse = {
      token: null,
      channelId: payload.channelId,
    }
    try {
      if (!client.user) {
        return;
      }

      // Verify user is in the room
      if (!this.channelRoomService.isUserInRoom(payload.channelId, client.user.id)) {
        this.logger.warn(
          `User ${client.user.name} tried to request token for room ${payload.channelId} they're not in`,
        );
        tokenResponse.error = `User not in channel ${payload.channelId}`;
        return tokenResponse
      }

      // Generate LiveKit token
      const token = await this.livekitService.generateToken(
        payload.channelId,
        client.user.id,
        client.user.name,
      );

        tokenResponse.token = token,
        tokenResponse.channelId= payload.channelId,

      this.logger.debug(
        `LiveKit token generated for user ${client.user.name} in room ${payload.channelId}`,
      );
      return tokenResponse;
    } catch (error) {
      this.logger.error(`Error generating LiveKit token:`, error);
      tokenResponse.error = `Failed to generate LiveKit token`;
      return tokenResponse
    }
  } // Event listeners for channel updates

 
  /**
   * Broadcast updated data for a specific channel
   */
  async broadcastChannelUpdate(channelId: string): Promise<void> {
    const usersData: ChannelLiveData = this.channelRoomService.getChannelLiveData(channelId);
    this.server.emit(
      SOCKET_EVENTS.CHANNEL_UPDATE, usersData)
  }

  /**
   * Broadcast updated data for all channels
   */
  async broadcastAllChannelsUpdate(): Promise<void> {
    const usersData: ChannelLiveData[] = this.channelRoomService.getChannelsLiveData();
    this.server.emit(
      SOCKET_EVENTS.CHANNELS_UPDATE, usersData)
  }

  /**
   * Broadcast user count for all channels (simplified version)
   */
  async broadcastUserCounts(): Promise<void> {
    
  }

  // Additional utility methods
  /**
   * Get room information for debugging/admin purposes
   */
  getRoomInfo(channelId: string) {
    return this.channelRoomService.getRoomInfo(channelId);
  }

  /**
   * Get all rooms information for debugging/admin purposes
   */
  getAllRoomsInfo() {
    return this.channelRoomService.getAllRoomsInfo();
  }

  /**
   * Get which rooms a user is currently in
   */
  getUserRooms(userId: string): string[] {
    return this.channelRoomService.getUserRooms(userId);
  }

  /**
   * Cleanup inactive rooms (can be called periodically)
   */
  cleanupInactiveRooms(maxInactiveMinutes: number = 60): number {
    return this.channelRoomService.cleanupInactiveRooms(maxInactiveMinutes);
  }
  /**
   * Send data to specific channel room
   */
  sendToChannel(channelId: string, event: string, data: any): void {
    this.server.to(channelId).emit(event, data);
  }

  /**
   * Send data to specific user in channel
   */
  sendToUserInChannel(
    channelId: string,
    userId: string,
    event: string,
    data: any,
  ): void {
    const userSockets = this.channelRoomService.getUserSocketsInRoom(
      channelId,
      userId,
    );
    userSockets.forEach((socketId) => {
      this.server.to(socketId).emit(event, data);
    });
  }
}
