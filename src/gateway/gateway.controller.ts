import { Controller, Get, Post, Param, UseGuards, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles-auth.decorator';
import { RolesEnum } from '../user/constants/roles.constant';
import { ChannelsGateway } from './channels.gateway';
import { ChannelRoomService } from './channel-room.service';

@Controller('gateway')
@UseGuards(JwtAuthGuard)
export class GatewayController {
  constructor(
    private readonly channelsGateway: ChannelsGateway,
    private readonly channelRoomService: ChannelRoomService,
  ) {}

  /**
   * Get information about a specific room (admin only)
   */
  @Get('rooms/:channelId')
  @UseGuards(RolesGuard)
  @Roles(RolesEnum.ADMIN)
  getRoomInfo(@Param('channelId') channelId: string) {
    return this.channelsGateway.getRoomInfo(channelId);
  }

  /**
   * Get information about all active rooms (admin only)
   */
  @Get('rooms')
  @UseGuards(RolesGuard)
  @Roles(RolesEnum.ADMIN)
  getAllRoomsInfo() {
    return this.channelsGateway.getAllRoomsInfo();
  }

  /**
   * Manually trigger cleanup of inactive rooms (admin only)
   */
  @Post('cleanup')
  @UseGuards(RolesGuard)
  @Roles(RolesEnum.ADMIN)
  cleanupInactiveRooms() {
    const cleanedCount = this.channelsGateway.cleanupInactiveRooms();
    return { message: `Cleaned up ${cleanedCount} inactive rooms` };
  }

  /**
   * Manually broadcast channel updates (admin only)
   */
  @Post('broadcast/channels')
  @UseGuards(RolesGuard)
  @Roles(RolesEnum.ADMIN)
  async broadcastChannelsUpdate() {
    await this.channelsGateway.broadcastAllChannelsUpdate();
    return { message: 'Broadcasted channels update' };
  }

  /**
   * Manually broadcast specific channel update (admin only)
   */
  @Post('broadcast/channel/:channelId')
  @UseGuards(RolesGuard)
  @Roles(RolesEnum.ADMIN)
  async broadcastChannelUpdate(@Param('channelId') channelId: string) {
    await this.channelsGateway.broadcastChannelUpdate(channelId);
    return { message: `Broadcasted update for channel ${channelId}` };
  }

  /**
   * Get room statistics for all channels
   */
  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(RolesEnum.ADMIN)
  getRoomStats() {
    const allRooms = this.channelsGateway.getAllRoomsInfo();
    return {
      totalRooms: allRooms.length,
      totalUsers: allRooms.reduce((sum, room) => sum + room.userCount, 0),
      totalSockets: allRooms.reduce((sum, room) => sum + room.socketCount, 0),
      rooms: allRooms.map(room => ({
        channelId: room.channelId,
        userCount: room.userCount,
        socketCount: room.socketCount,
        isActive: room.userCount > 0,
        lastActivity: room.lastActivity,
      })),
    };
  }
}
