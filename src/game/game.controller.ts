// livekit.controller.ts or colyseus.controller.ts
import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { matchMaker, Room, RoomCache } from 'colyseus';
import { GameRoom } from './game.room';

@Controller('colyseus')
export class GameController {
    constructor() {}
  @Get('room/:roomId')
  async getPlayers(@Param('roomId') roomId: string) {
    try {
      const room: Room<GameRoom>  = matchMaker.getLocalRoomById(roomId);
      const players = Array.from(room.state.state.players.values()).map((player: any) => ({
        id: player.id,
        x: player.x,
        y: player.y,
        currentZoneId: player.currentZoneId,
        nearbyUsers: player.nearbyUsers?.toArray?.() ?? [], // If using ArraySchema
      }));

      return { roomId, players };
    } catch (err) {
        console.error(err);
      throw new NotFoundException('Room not found');
    }
  }
}
