import { Room, Client, matchMaker,AuthContext } from 'colyseus';
import { Schema, type, MapSchema } from '@colyseus/schema';
import { Door, Player, Zone } from './schemas/room.schema';
import { JsonMapParser } from './map/map.parser';
import { TiledMap } from './map/types/map.types';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ColyseusEventPayloads, GameEvents } from './common/events';
import { UserDocument } from 'src/user/user.model';
import { ColyseusError, Errors } from './common/errors';
import { RolesEnum, RolesEnumType } from 'src/user/constants/roles.constant';
import { ChannelUserDto } from 'src/user/dtos/channel-user.dto';
import { UserDto } from 'src/user/dtos/user.dto';
import { PLAYER_VISION_MASK_SIZE } from '../../constants';
import { DoorObject } from './map/types/map.types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ChannelsService } from 'src/channel/channel.service';
import { plainToClass, plainToInstance } from 'class-transformer';
export type GameRoomOptions = {
  token: string | null;
  channelId: string;
};

export type RoomMetadata = {
  mapId: string;
  channelId: string;
  maxClients: number;
  channelName: string;
}
export class RoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Zone }) zones = new MapSchema<Zone>();
  @type({ map: Door }) doors = new MapSchema<Door>();
}

export class GameRoom extends Room<RoomState, RoomMetadata, UserDto> {
  static userService: UserService;
  static jwtService: JwtService;
  static channelsService: ChannelsService
  private tiledMapParser: JsonMapParser;
  // maxClients = 10;
  async onAuth(client: Client<UserDto, any>, options: GameRoomOptions) {
    //console.log(options)
    const token = options.token;
    if (!token) return false;
    try {
      const decoded = GameRoom.jwtService.verify(token) as UserDto; // 👈 Decode token
      const user = await GameRoom.userService.findById(decoded.id, false); // 👈 Load full user

      if (!user) return false;
      // client.userData = {
      //   id: "user123"}
      client.userData =plainToInstance(UserDto, user, {excludeExtraneousValues: true});
      console.log('Client user data on auth:', client.userData);
      return true;
    } catch (err) {
      console.error('Auth error:', err);
      //throw new Error("Token invallid");
    }
  } 
  async onCreate(options: GameRoomOptions) {
    this.state = new RoomState();
    console.log(`Room ${this.roomId} created with options:`, options);
    
    try {
      // Get channel data from database first
      const channel = await GameRoom.channelsService.findById(options.channelId);
      if (!channel) {
        throw new Error(`Canalul ${options.channelId} nu a fost găsit în baza de date`);
      }

      if (!channel.isActive) {
        throw new Error(`Canalul ${options.channelId} nu este activ`);
      }      // Check if a room for this channel already exists using multiple methods
      let existingChannelRooms: any[] = [];
      
      try {
        // Method 1: Use matchMaker query
        const allRooms = await matchMaker.query({ name: 'channel' });
        existingChannelRooms = allRooms.filter((room) => 
          (room.metadata as RoomMetadata)?.channelId === options.channelId
        );
        console.log(`Found ${existingChannelRooms.length} existing rooms for channel ${options.channelId}`);
      } catch (err) {
        console.warn('MatchMaker query failed:', err.message);
      }

      
      if (existingChannelRooms.length > 0) {
        console.log(`Room for channel ${options.channelId} already exists:`, existingChannelRooms[0].roomId);
        throw new Error(`Un canal pentru ${channel.name} (${options.channelId}) există deja`);
      }

      // Set maxClients from channel data
      this.maxClients = channel.maxUsers;
      console.log(`Setting maxClients to ${this.maxClients} for channel ${channel.name}`);

      

      this.setMetadata({
        channelId: options.channelId, 
        mapId: channel.mapName, 
        maxClients: this.maxClients,
        channelName: channel.name
      });
    
      this.tiledMapParser = new JsonMapParser(channel.mapName);

      // Create zones and doors
      this.initializeMap(this.tiledMapParser.parsedMap);

      this.onMessage(
        GameEvents.PLAYER_MOVE,
        (
          client: Client<UserDto, any>,
          data: ColyseusEventPayloads[GameEvents.PLAYER_MOVE],
        ) => {
          try {
            //this.checkRole(client, RolesEnum.USER)

            const player = this.state.players.get(client.userData.id);
            if (player) {
              player.x = data.x;
              player.y = data.y;

              let changed = this.updateNearbyUsers(player.id, this.state);

              if (changed) {
                console.log(
                  'Nearby users for player',
                  player.id,
                  Array.from(this.state.players.get(player.id).nearbyUsers),
                );
                //  const nearbyUsers = this.getNearbyUsers(player.id, this.state.players);
                // this.lastNearbyUsers = nearbyUsers
                // console.log("Nearby users for player", player.id, ":", nearbyUsers);
                this.state.players
                  .get(player.id)
                  .nearbyUsers.forEach((userId) => {
                    const otherPlayer = this.state.players.get(userId);
                    if (otherPlayer) {
                      //const nearbyForOtherUser = this.getNearbyUsers(player.id, this.state.players);
                      console.log(
                        'Nearby users for other player',
                        userId,
                        ':',
                        Array.from(otherPlayer.nearbyUsers),
                      );
                    }
                  });
                console.log('\n');
                // if(nearbyUsers.length === 0){
                //   this.lastNearbyUsers.forEach(userId => {
                //     const otherPlayer = this.state.players.get(userId);
                //     if(otherPlayer){
                //       const nearbyForOtherUser = this.getNearbyUsers(player.id, this.state.players);
                //       console.log("Nearby users for other player", userId, ":", nearbyForOtherUser);
                //     }
                //   })
                // }
              }
              // Optional: Check if player entered new zone
              //this.checkZoneTransition(player);
            }
          } catch (err) {
            if (err instanceof ColyseusError) {
              client.error(err.code, err.message);
            } else {
              client.error(500, 'Eroare interna');
            }
          }
        },
      );
      this.onMessage(
        GameEvents.DOOR_TRIGGER,
        (
          client: Client<UserDto, any>,
          data: ColyseusEventPayloads[GameEvents.DOOR_TRIGGER],
        ) => {
          try {
            const player = this.state.players.get(client.userData.id);
            if (!player) return;
            const targetZone = this.state.zones.get(data.zoneId.toString());
            if (!targetZone) return;
            const zoneData = this.tiledMapParser.zones.find(
              (z) => z.zoneId === data.zoneId,
            );
            if (!zoneData) return;
            const isInsideZone = player.currentZoneId === data.zoneId;
            if (isInsideZone) {
              targetZone.isOpen = !targetZone.isOpen;
            } else {
              // ❌ Outside zone: must ring if door is closed and near
              if (targetZone.isOpen) {
                client.send(GameEvents.MESSAGE, {
                  message: 'Trebuie sa fii in zona ca sa inchizi usa',
                });
                return;
              }

              // Check proximity to any door
              const isNearDoor = this.tiledMapParser.getDoorsByZoneId(zoneData.zoneId).some((door) =>
                this.isPlayerNearDoor(player, door),
              );
              if (isNearDoor) {
                const outTargetZoneUsers = Array.from(
                  this.state.players.values(),
                ).filter(
                  (p) =>
                    p.currentZoneId !== data.zoneId ||
                    p.id === client.userData.id, // Exclude the current ringing client here
                );
                // Extract the user IDs from those players
                const excludedUserIds = outTargetZoneUsers.map((p) => p.id);

                // Now filter the clients by those IDs
                const clientsToExcept = this.clients.filter((c) =>
                  excludedUserIds.includes(c.userData.id),
                );
                // ✅ Send ring event to others (or trigger logic)
                this.broadcast(
                  GameEvents.DOOR_RING,
                  {
                    zoneId: zoneData.zoneId,
                    by: player.id,
                  } as ColyseusEventPayloads[GameEvents.DOOR_RING],
                  { except: clientsToExcept },
                );
              } else {
                // ❌ Too far to ring
                client.send(GameEvents.MESSAGE, {
                  message: 'Esti prea departe de usa',
                });
              }
            }
            // this.mapData.zones.forEach(zone => {

            //   if(zone.id === data.zoneId){
            //     const zoneToTrigger = this.state.zones.get(zone.id.toString())
            //     zoneToTrigger.isOpen = !zoneToTrigger.isOpen
            //   }
            // })
          } catch (err) {
            const code = err instanceof ColyseusError ? err.code : 500;
            const msg =
              err instanceof ColyseusError ? err.message : 'Eroare interna';
            client.error(code, msg);
          }
        },
      );
      this.onMessage(
        GameEvents.CURRENT_ZONE,
        (
          client: Client<any, any>,
          data: ColyseusEventPayloads[GameEvents.CURRENT_ZONE],
        ) => {
          console.log(
            'Current zone change, User: ',
            client.userData.id,
            data.zoneId,
          );
          try {
            if (data.zoneId === -1) {
              const player = this.state.players.get(client.userData.id);
              if (player) {
                player.currentZoneId = data.zoneId;
              }
            }
            this.state.zones.forEach((zone) => {
              if (zone.id === data.zoneId) {
                const player = this.state.players.get(client.userData.id);
                if (player) {
                  player.currentZoneId = zone.id;
                }
              }
            });
          } catch (err) {
            if (err instanceof ColyseusError) {
              client.error(err.code, err.message);
            } else {
              client.error(500, 'Eroare interna');
            }
          }
        },
      );
    } catch (error) {
      console.error('Failed to initialize map:', error);
      this.disconnect();
    }
  }

  async onJoin(client: Client) {
    const user: ChannelUserDto = {
      id: client.userData.id,
      email: client.userData.email,
      name: client.userData.name,
      avatar: client.userData.avatar,
      x: 480,
      y: 1030,
      currentZoneId: -1,
    };
    const newPlayer = new Player();
    newPlayer.id = client.userData.id;
    newPlayer.currentZoneId = -1;
    newPlayer.x = 480;
    newPlayer.y = 1030;
    this.state.players.set(newPlayer.id, newPlayer);
    const users = await GameRoom.userService.getUsersById(
      Array.from(this.state.players.keys()).filter(
        (id) => id !== client.userData.id,
      ),
    );
    const usersDto = users.map((user) => {
      return new ChannelUserDto(
        user.id,
        user.email,
        user.fullName,
        '',
        this.state.players.get(user.id).x,
        this.state.players.get(user.id).y,
      );
    });
    client.send(GameEvents.INIT_USERS, usersDto);
    this.broadcast(GameEvents.PLAYER_JOINED, user);
    console.log(`Player ${client.userData.id} joined.`);
  }

  onLeave(client: Client) {
    const leavingId = client.userData.id;
    for (const player of this.state.players.values()) {
      if (player.nearbyUsers.includes(leavingId)) {
        delete player.nearbyUsers[leavingId];
      }
    }
    const leavingPlayer = this.state.players.get(leavingId);
    if(leavingPlayer.currentZoneId !== -1){
      const zone = this.state.zones.get(leavingPlayer.currentZoneId.toString());
      if(!zone.isOpen) {
        // Check if any players are still in this zone
        let playersInZone = false;
        this.state.players.forEach(p => {
          if(p.id !== leavingId && p.currentZoneId === zone.id) {
        playersInZone = true;
          }
        });
        
        // If no players left in the zone, we can safely close it
        if(!playersInZone) {
          zone.isOpen = true;
        }
      }
        }
        this.state.players.delete(client.userData.id);
        
        console.log(`Player ${client.userData.id} left.`);
  }

  onDispose() {
    console.log(`Room ${this.roomId} disposed.`);
  }

  private initializeMap(mapData: TiledMap) {
    // Create zones
    this.tiledMapParser.zones.forEach((zoneData) => {
      const zone = new Zone();
      zone.id = zoneData.zoneId;

      this.state.zones.set(zone.id.toString(), zone);

      // Create doors for this zone
      this.tiledMapParser.doors.forEach((doorData) => {
        const door = new Door();
        door.id = doorData.id;
        this.state.doors.set(door.id.toString(), door);
      });
    });

    console.log(
      `Initialized ${this.state.zones.size} zones with ${this.state.doors.size} doors`,
    );
  }

  private checkRole(
    client: Client<UserDocument, any>,
    requiredRole: RolesEnumType,
  ) {
    if (!client.userData?.roles.includes(requiredRole)) {
      throw Errors.UNAUTHORIZED;
    }
  }
  private isPlayerNearDoor(player: Player, door: DoorObject): boolean {
    const proximityRadius = PLAYER_VISION_MASK_SIZE; // or any range in px/units

    const dx = player.x - door.x;
    const dy = player.y - door.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= proximityRadius;
  }
  private getNearbyUsers(
    playerId: string,
    allPlayers: MapSchema<Player>,
    range = PLAYER_VISION_MASK_SIZE,
  ): string[] {
    const player = allPlayers.get(playerId);
    if (!player) return [];

    const result: string[] = [];

    for (const [id, other] of allPlayers.entries()) {
      if (id === playerId) continue;
      if (player.currentZoneId !== -1 || other.currentZoneId !== -1) continue; // Check if in the same zone
      const dx = player.x - other.x;
      const dy = player.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= range) {
        result.push(id);
      }
    }

    return result;
  }

  private updateNearbyUsers(playerId: string, state: RoomState): boolean {
    const player = state.players.get(playerId);
    if (!player) return false;

    const newNearby = this.getNearbyUsers(playerId, state.players);
    const oldNearby = Array.from(player.nearbyUsers ?? []);

    const changed =
      newNearby.length !== oldNearby.length ||
      !newNearby.every((id) => oldNearby.includes(id));

    if (changed) {
      //player.nearbyUsers.splice(0, player.nearbyUsers.length, ...newNearby); // Clear the array
      player.nearbyUsers.clear();
      for (const id of newNearby) {
        player.nearbyUsers.push(id);
      }

      // Also update reciprocal lists
      for (const otherId of newNearby) {
        const other = state.players.get(otherId);
        if (other && !other.nearbyUsers.includes(playerId)) {
          other.nearbyUsers.push(playerId);
        }
      }

      // Remove playerId from others' lists if they are no longer nearby
      for (const other of state.players.values()) {
        if (other.id !== playerId && other.nearbyUsers.includes(playerId)) {
          const playerIsNearby = newNearby.includes(other.id);
          if (!playerIsNearby) {
            const index = other.nearbyUsers.indexOf(playerId);
            if (index !== -1) {
              other.nearbyUsers.splice(index, 1);
            }
            //other.nearbyUsers = other.nearbyUsers.filter(id => id !== playerId);
          }
        }
      }
    }

    return changed;
  }
}
