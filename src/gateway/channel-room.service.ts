import { Injectable, Logger } from '@nestjs/common';
import { UserDto } from '../user/dtos/user.dto';

interface ChannelRoom {
  channelId: string;
  users: Map<string, UserDto>; // socketId -> UserDto
  socketToUser: Map<string, string>; // socketId -> userId
  userToSockets: Map<string, Set<string>>; // userId -> Set<socketId>
  createdAt: Date;
  lastActivity: Date;
}

@Injectable()
export class ChannelRoomService {
  private readonly logger = new Logger(ChannelRoomService.name);
  private rooms = new Map<string, ChannelRoom>();

  /**
   * Create or get a channel room
   */
  getOrCreateRoom(channelId: string): ChannelRoom {
    if (!this.rooms.has(channelId)) {
      const room: ChannelRoom = {
        channelId,
        users: new Map(),
        socketToUser: new Map(),
        userToSockets: new Map(),
        createdAt: new Date(),
        lastActivity: new Date(),
      };
      this.rooms.set(channelId, room);
      this.logger.debug(`Created new room: ${channelId}`);
    }
    
    const room = this.rooms.get(channelId)!;
    room.lastActivity = new Date();
    return room;
  }

  /**
   * Add user to a channel room
   */
  joinRoom(channelId: string, socketId: string, user: UserDto): boolean {
    try {
      const room = this.getOrCreateRoom(channelId);
      
      // Add socket to user mapping
      room.socketToUser.set(socketId, user.id);
      
      // Add user to sockets mapping
      if (!room.userToSockets.has(user.id)) {
        room.userToSockets.set(user.id, new Set());
      }
      room.userToSockets.get(user.id)!.add(socketId);
      
      // Add user to room (only if not already present)
      if (!room.users.has(user.id)) {
        room.users.set(user.id, user);
        this.logger.debug(`User ${user.name} joined room ${channelId}`);
        return true; // User was newly added
      }
      
      this.logger.debug(`User ${user.name} connected with additional socket to room ${channelId}`);
      return false; // User was already in room, just additional socket
    } catch (error) {
      this.logger.error(`Failed to join room ${channelId}:`, error);
      return false;
    }
  }

  /**
   * Remove user socket from a channel room
   */
  leaveRoom(channelId: string, socketId: string): { user: UserDto | null; userLeftRoom: boolean } {
    const room = this.rooms.get(channelId);
    if (!room) {
      return { user: null, userLeftRoom: false };
    }

    const userId = room.socketToUser.get(socketId);
    if (!userId) {
      return { user: null, userLeftRoom: false };
    }

    const user = room.users.get(userId);
    
    // Remove socket mappings
    room.socketToUser.delete(socketId);
    
    // Remove socket from user's socket set
    const userSockets = room.userToSockets.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      
      // If user has no more sockets, remove them from room
      if (userSockets.size === 0) {
        room.userToSockets.delete(userId);
        room.users.delete(userId);
        
        this.logger.debug(`User ${user?.name} left room ${channelId}`);
        
        // Clean up empty room
        if (room.users.size === 0) {
          this.rooms.delete(channelId);
          this.logger.debug(`Deleted empty room: ${channelId}`);
        }
        
        return { user: user || null, userLeftRoom: true };
      }
    }
    
    return { user: user || null, userLeftRoom: false };
  }

  /**
   * Remove user from all rooms when they disconnect
   */
  handleDisconnect(socketId: string): Array<{ channelId: string; user: UserDto; userLeftRoom: boolean }> {
    const results: Array<{ channelId: string; user: UserDto; userLeftRoom: boolean }> = [];
    
    for (const [channelId] of this.rooms) {
      const { user, userLeftRoom } = this.leaveRoom(channelId, socketId);
      if (user) {
        results.push({ channelId, user, userLeftRoom });
      }
    }
    
    return results;
  }

  /**
   * Get all users in a channel room
   */
  getUsersInRoom(channelId: string): UserDto[] {
    const room = this.rooms.get(channelId);
    return room ? Array.from(room.users.values()) : [];
  }

  /**
   * Get room info
   */
  getRoomInfo(channelId: string) {
    const room = this.rooms.get(channelId);
    if (!room) {
      return null;
    }

    return {
      channelId: room.channelId,
      userCount: room.users.size,
      socketCount: room.socketToUser.size,
      users: Array.from(room.users.values()),
      createdAt: room.createdAt,
      lastActivity: room.lastActivity,
    };
  }

  /**
   * Get all active rooms info
   */
  getAllRoomsInfo() {
    const roomsInfo = [];
    for (const [channelId, room] of this.rooms) {
      roomsInfo.push({
        channelId,
        userCount: room.users.size,
        socketCount: room.socketToUser.size,
        users: Array.from(room.users.values()),
        createdAt: room.createdAt,
        lastActivity: room.lastActivity,
      });
    }
    return roomsInfo;
  }

  /**
   * Get socket IDs for all users in a room
   */
  getSocketsInRoom(channelId: string): string[] {
    const room = this.rooms.get(channelId);
    return room ? Array.from(room.socketToUser.keys()) : [];
  }

  /**
   * Get socket IDs for a specific user in a room
   */
  getUserSocketsInRoom(channelId: string, userId: string): string[] {
    const room = this.rooms.get(channelId);
    if (!room) return [];
    
    const userSockets = room.userToSockets.get(userId);
    return userSockets ? Array.from(userSockets) : [];
  }
  /**
   * Check if user is in room
   */
  isUserInRoom(channelId: string, userId: string): boolean {
    const room = this.rooms.get(channelId);
    return room ? room.users.has(userId) : false;
  }

  /**
   * Get all rooms that a user is currently in
   */
  getUserRooms(userId: string): string[] {
    const userRooms: string[] = [];
    for (const [channelId, room] of this.rooms) {
      if (room.users.has(userId)) {
        userRooms.push(channelId);
      }
    }
    return userRooms;
  }

  /**
   * Leave all rooms for a specific user (for single room policy)
   */
  leaveAllRoomsForUser(userId: string): Array<{ channelId: string; userLeftRoom: boolean }> {
    const results: Array<{ channelId: string; userLeftRoom: boolean }> = [];
    
    // Get all user's sockets across all rooms
    const userSockets: string[] = [];
    for (const [channelId, room] of this.rooms) {
      if (room.users.has(userId)) {
        const sockets = room.userToSockets.get(userId);
        if (sockets) {
          userSockets.push(...Array.from(sockets));
        }
      }
    }
    
    // Remove user from all rooms
    for (const socketId of userSockets) {
      for (const [channelId] of this.rooms) {
        const { userLeftRoom } = this.leaveRoom(channelId, socketId);
        if (userLeftRoom) {
          results.push({ channelId, userLeftRoom: true });
        }
      }
    }
    
    return results;
  }

  /**
   * Get room statistics for channel live data
   */
  getRoomStats(channelId: string) {
    const room = this.rooms.get(channelId);
    return {
      clientsCount: room?.users.size || 0,
      socketsCount: room?.socketToUser.size || 0,
      isActive: room ? room.users.size > 0 : false,
    };
  }

  /**
   * Clean up inactive rooms (can be called periodically)
   */
  cleanupInactiveRooms(maxInactiveMinutes: number = 60): number {
    let cleanedCount = 0;
    const cutoffTime = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);
    
    for (const [channelId, room] of this.rooms) {
      if (room.users.size === 0 && room.lastActivity < cutoffTime) {
        this.rooms.delete(channelId);
        cleanedCount++;
        this.logger.debug(`Cleaned up inactive room: ${channelId}`);
      }
    }
    
    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} inactive rooms`);
    }
    
    return cleanedCount;
  }

  /**
   * Get channels live data in the same format as GameService
   */
  getChannelsLiveData(): Array<{
    channelId: string;
    clientsCount: number;
    isActive: boolean;
  }> {
    const channelsData = [];
    
    for (const [channelId, room] of this.rooms) {
      channelsData.push({
        channelId,
        clientsCount: room.users.size,
        isActive: room.users.size > 0,
      });
    }
    
    return channelsData;
  }

  /**
   * Get channel live data for a specific channel in the same format as GameService
   */
  getChannelLiveData(channelId: string): {
    channelId: string;
    clientsCount: number;
    isActive: boolean;
  } {
    const room = this.rooms.get(channelId);
    
    return {
      channelId,
      clientsCount: room?.users.size || 0,
      isActive: room ? room.users.size > 0 : false,
    };
  }
}
