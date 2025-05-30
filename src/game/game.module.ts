import { Module } from '@nestjs/common';
import { GameRoom } from './game.room';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameBroadcastService } from './game-broadcast.service';

@Module({
    imports: [],
    providers: [GameRoom, GameService, GameBroadcastService],
    exports: [GameRoom, GameService, GameBroadcastService],
    controllers: [GameController],
})
export class GameModule {}
