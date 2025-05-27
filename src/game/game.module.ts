import { Module } from '@nestjs/common';
import { GameRoom } from './game.room';
import { GameController } from './game.controller';
import { GameService } from './game.service';

@Module({
    providers: [GameRoom, GameService],
    exports: [GameRoom, GameService],
    controllers: [GameController],
})
export class GameModule {}
