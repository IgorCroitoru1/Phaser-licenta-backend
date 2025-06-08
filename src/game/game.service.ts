import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { IRoomCache, matchMaker, Room } from 'colyseus';
import { GameRoom, RoomMetadata } from './game.room';

export interface RoomInfo {
  roomId: string;
  channelId: string;
  clientsCount: number;
  maxClients: number;
  isLocked: boolean;
  metadata?: any;
  createdAt: Date;
}

export interface RoomStats {
  totalRooms: number;
  totalClients: number;
  rooms: RoomInfo[];
}

export interface ClientInfo {
  playerId: string;
  roomId: string;
  channelId: string;
  position: { x: number; y: number };
  currentZoneId: number;
  nearbyUsers: string[];
}

export interface ChannelLiveData {
  channelId: string;
  clientsCount: number;
  isActive: boolean;
}

@Injectable()
export class GameService {
  async debugMatchMaker() {
    try {
      console.log('=== MatchMaker Debug Info ===');
      
      // Try to get all available rooms using different methods
      const queryResult = await matchMaker.query({});
      console.log('Query all rooms:', queryResult);

      const channelRooms = await matchMaker.query({ name: 'channel' });
      console.log('Channel rooms:', channelRooms);

      // Try to access the driver directly for more debug info
      const driver = (matchMaker as any).driver;
      if (driver && driver.getAllRooms) {
        const allRooms = await driver.getAllRooms();
        console.log('Driver rooms:', allRooms);
      }

      return {
        allRooms: queryResult,
        channelRooms: channelRooms,
        matchMakerMethods: Object.getOwnPropertyNames(matchMaker),
        timestamp: new Date()
      };
    } catch (err) {
      console.error('Debug error:', err);
      return {
        error: err.message,
        stack: err.stack,
        timestamp: new Date()
      };
    }
  }

  async getAllActiveRooms(): Promise<RoomStats> {
    try {

      // Try multiple approaches to get rooms
      let rooms: IRoomCache[] = [];
      
      try {
        // Method 1: Query by room name
        rooms = await matchMaker.query({ name: 'channel' });
        // console.log('Method 1 - Channel rooms found:', rooms.length);
      } catch (err) {
        console.log('Method 1 failed:', err.message);
      }

      if (rooms.length === 0) {
        try {
          // Method 2: Query all rooms
          const allRooms = await matchMaker.query({});
          rooms = allRooms.filter(room => room.name === 'channel');
        } catch (err) {
          console.log('Method 2 failed:', err.message);
        }
      }

      const roomsInfo: RoomInfo[] = rooms.map(room => ({
        roomId: room.roomId,
        channelId: (room.metadata as RoomMetadata)?.channelId || 'unknown',
        clientsCount: room.clients || room.clientsCount || 0,
        maxClients: room.maxClients || 50,
        isLocked: room.locked || false,
        metadata: (room.metadata as RoomMetadata) || {},
        createdAt: new Date(room.createdAt || Date.now())
      }));

      const totalClients = roomsInfo.reduce((sum, room) => sum + room.clientsCount, 0);

      return {
        totalRooms: roomsInfo.length,
        totalClients,
        rooms: roomsInfo
      };
    } catch (err) {
      console.error('Error fetching rooms:', err);
      throw new InternalServerErrorException('Could not fetch active rooms: ' + err.message);
    }
  }

  async getRoomsStats() {
    try {
      const roomsData = await this.getAllActiveRooms();
      const rooms = roomsData.rooms;

      const stats = {
        totalRooms: rooms.length,
        totalClients: roomsData.totalClients,
        averageClientsPerRoom: rooms.length > 0 
          ? Math.round((roomsData.totalClients / rooms.length) * 100) / 100 
          : 0,
        roomsWithClients: rooms.filter(room => room.clientsCount > 0).length,
        emptyRooms: rooms.filter(room => room.clientsCount === 0).length,
        fullRooms: rooms.filter(room => room.clientsCount >= room.maxClients).length,
        roomsByChannel: rooms.reduce((acc, room) => {
          const channel = room.channelId;
          acc[channel] = (acc[channel] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      return stats;
    } catch (err) {
      console.error('Error fetching room stats:', err);
      throw new InternalServerErrorException('Could not fetch room statistics: ' + err.message);
    }
  }

  async getAllClientsFromAllRooms() {
    try {
      const roomsData = await this.getAllActiveRooms();
      const rooms = roomsData.rooms;

      let allClients: ClientInfo[] = [];
      let totalClientsFromRoomState = 0;
      let errors: string[] = [];

      for (const roomInfo of rooms) {
        try {
          // Try to get the actual room instance to access detailed client data
          const room = matchMaker.getLocalRoomById(roomInfo.roomId);
          
          if (room && room.state && room.state.state && room.state.state.players) {
            const roomClients = Array.from(room.state.state.players.values()).map((player: any) => ({
              playerId: player.id,
              roomId: roomInfo.roomId,
              channelId: roomInfo.channelId,
              position: {
                x: player.x || 0,
                y: player.y || 0
              },
              currentZoneId: player.currentZoneId || -1,
              nearbyUsers: player.nearbyUsers?.toArray?.() ?? []
            }));

            allClients.push(...roomClients);
            totalClientsFromRoomState += roomClients.length;
          } else {
            errors.push(`Could not access state for room ${roomInfo.roomId}`);
          }
        } catch (roomErr) {
          errors.push(`Error accessing room ${roomInfo.roomId}: ${roomErr.message}`);
          console.warn(`Could not access room ${roomInfo.roomId}:`, roomErr);
        }
      }

      return {
        totalClients: roomsData.totalClients,
        totalRooms: rooms.length,
        clients: allClients,
        summary: {
          clientsWithDetailedInfo: allClients.length,
          totalReportedClients: roomsData.totalClients,
          clientsFromRoomState: totalClientsFromRoomState
        },
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (err) {
      console.error('Error fetching all clients:', err);
      throw new InternalServerErrorException('Could not fetch clients from rooms: ' + err.message);
    }
  }

  async getPlayersInRoom(roomId: string) {
    try {
      const room: Room<GameRoom> = matchMaker.getLocalRoomById(roomId);
      
      if (!room || !room.state || !room.state.state || !room.state.state.players) {
        throw new NotFoundException('Room not found or has no state');
      }

      const players = Array.from(room.state.state.players.values()).map((player: any) => ({
        id: player.id,
        x: player.x,
        y: player.y,
        currentZoneId: player.currentZoneId,
        nearbyUsers: player.nearbyUsers?.toArray?.() ?? []
      }));

      return { 
        roomId, 
        players,
        clientsCount: players.length,
        metadata: room.metadata || {}
      };
    } catch (err) {
      console.error('Error getting players:', err);
      throw new NotFoundException('Room not found: ' + err.message);
    }
  }

  async getRoomInfo(roomId: string) {
    try {
      const roomsData = await this.getAllActiveRooms();
      const roomInfo = roomsData.rooms.find(room => room.roomId === roomId);
      
      if (!roomInfo) {
        throw new NotFoundException('Room not found');
      }

      return roomInfo;
    } catch (err) {
      console.error('Error fetching room info:', err);
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException('Could not fetch room information: ' + err.message);
    }
  }

  // New methods specifically for channels live data
  async getChannelsLiveData(): Promise<ChannelLiveData[]> {
    try {
      const roomsData = await this.getAllActiveRooms();
      const channelsMap = new Map<string, ChannelLiveData>();

      // Group rooms by channel and calculate totals
      roomsData.rooms.forEach(room => {
        const channelId = room.channelId;
        if (!channelsMap.has(channelId)) {
          channelsMap.set(channelId, {
            channelId,
            clientsCount: 0,
            isActive: false
          });
        }

        const channelData = channelsMap.get(channelId)!;
        channelData.clientsCount += room.clientsCount;
        channelData.isActive = channelData.clientsCount > 0 || channelData.isActive;
      });

      return Array.from(channelsMap.values());
    } catch (err) {
      console.error('Error fetching channels live data:', err);
      throw new InternalServerErrorException('Could not fetch channels live data: ' + err.message);
    }
  }

  async getChannelLiveData(channelId: string): Promise<ChannelLiveData | null> {
    try {
      const allChannelsData = await this.getChannelsLiveData();
      return allChannelsData.find(channel => channel.channelId === channelId) || {
        channelId,
        clientsCount: 0,
        isActive: false
      };
    } catch (err) {
      console.error('Error fetching channel live data:', err);
      throw new InternalServerErrorException('Could not fetch channel live data: ' + err.message);
    }
  }

  // Long polling helper method
  async waitForChannelChanges(lastTimestamp?: number, timeout: number = 30000): Promise<{
    data: ChannelLiveData[];
    timestamp: number;
    hasChanges: boolean;
  }> {
    const startTime = Date.now();
    const checkInterval = 1000; // Check every second

    return new Promise((resolve) => {
      const checkForChanges = async () => {
        try {
          const currentData = await this.getChannelsLiveData();
          const currentTimestamp = Date.now();
          
          // If no lastTimestamp provided, return current data
          if (!lastTimestamp) {
            resolve({
              data: currentData,
              timestamp: currentTimestamp,
              hasChanges: true
            });
            return;
          }

          // Simple change detection - in a real app you might want more sophisticated change tracking
          const hasChanges = currentTimestamp - lastTimestamp > checkInterval;
          
          if (hasChanges || Date.now() - startTime >= timeout) {
            resolve({
              data: currentData,
              timestamp: currentTimestamp,
              hasChanges
            });
            return;
          }

          // Continue checking
          setTimeout(checkForChanges, checkInterval);
        } catch (err) {
          console.error('Error checking for changes:', err);
          resolve({
            data: [],
            timestamp: Date.now(),
            hasChanges: false
          });
        }
      };

      checkForChanges();
    });
  }
}