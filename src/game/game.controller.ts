import { Controller, Get, Param } from '@nestjs/common';
import { GameService } from './game.service';

@Controller('colyseus')
export class GameController {
  constructor(private readonly gameService: GameService) {}
  @Get('debug')
  async debugMatchMaker() {
    return this.gameService.debugMatchMaker();
  }

  @Get('rooms')
  async getAllActiveRooms() {
    return this.gameService.getAllActiveRooms();
  }

  @Get('rooms/stats')
  async getRoomsStats() {
    return this.gameService.getRoomsStats();
  }

  @Get('rooms/clients')
  async getAllClientsFromAllRooms() {
    return this.gameService.getAllClientsFromAllRooms();
  }

  @Get('room/:roomId')
  async getPlayers(@Param('roomId') roomId: string) {
    return this.gameService.getPlayersInRoom(roomId);
  }

  @Get('room/:roomId/info')
  async getRoomInfo(@Param('roomId') roomId: string) {
    return this.gameService.getRoomInfo(roomId);
  }
}
