import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { GameService, ChannelLiveData } from '../game/game.service';
import { CHANNEL_EVENTS, AllChannelsUpdateEvent, ChannelUpdateEvent } from '../game/events/channel.events';
import { SOCKET_EVENTS } from './constants';
import { UserDto } from 'src/user/dtos/user.dto';

// Interface for authenticated socket
interface AuthenticatedSocket extends Socket {
  user?: UserDto
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: 'http://localhost:8080',
    credentials: true,
  },
  namespace: '/channels',
})
export class ChannelsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChannelsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly gameService: GameService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    try {
      // Extract token from handshake auth or query
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      
      

      // Attach user to socket
      client.user = payload as UserDto;

      this.logger.log(`Client connected: ${client.user.name} (${client.user.email})`);      // Send initial channel data
      const channelsData = await this.gameService.getChannelsLiveData();
      client.emit(SOCKET_EVENTS.CHANNELS_INITIAL, channelsData);

    } catch (error) {
      this.logger.warn(`Connection rejected: Invalid token - ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      this.logger.log(`Client disconnected: ${client.user.name} (${client.user.email})`);
    } else {
      this.logger.log('Unauthenticated client disconnected');
    }  }

  // Event listeners for channel updates
  
  @OnEvent(CHANNEL_EVENTS.CHANNEL_UPDATE)
  async handleChannelUpdate(event: ChannelUpdateEvent): Promise<void> {
    await this.broadcastChannelUpdate(event.channelId);
  }

  @OnEvent(CHANNEL_EVENTS.ALL_CHANNELS_UPDATE)
  async handleAllChannelsUpdate(event: AllChannelsUpdateEvent): Promise<void> {
    await this.broadcastAllChannelsUpdate();
  }

  // Broadcast methods for the application to use
    /**
   * Broadcast updated data for a specific channel
   */
  async broadcastChannelUpdate(channelId: string): Promise<void> {
    try {
      const channelData = await this.gameService.getChannelLiveData(channelId);
      if (channelData) {
        this.server.emit(SOCKET_EVENTS.CHANNEL_UPDATE, channelData);
        this.logger.debug(`Broadcasted update for channel: ${channelId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to broadcast channel update for ${channelId}:`, error);
    }
  }
  /**
   * Broadcast updated data for all channels
   */
  async broadcastAllChannelsUpdate(): Promise<void> {
    try {
      const channelsData = await this.gameService.getChannelsLiveData();
      this.server.emit(SOCKET_EVENTS.CHANNELS_UPDATE, channelsData);
      // this.logger.debug('Broadcasted update for all channels');
    } catch (error) {
      this.logger.error('Failed to broadcast all channels update:', error);
    }
  }
  /**
   * Broadcast user count for all channels (simplified version)
   */
  async broadcastUserCounts(): Promise<void> {
    try {
      const channelsData = await this.gameService.getChannelsLiveData();
      const userCounts = channelsData.map(channel => ({
        channelId: channel.channelId,
        userCount: channel.clientsCount,
        isActive: channel.isActive,
      }));
      
      this.server.emit(SOCKET_EVENTS.CHANNELS_USER_COUNTS, userCounts);
      this.logger.debug('Broadcasted user counts for all channels');
    } catch (error) {
      this.logger.error('Failed to broadcast user counts:', error);
    }
  }
}
