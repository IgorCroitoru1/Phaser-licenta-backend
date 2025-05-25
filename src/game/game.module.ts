import { Module } from '@nestjs/common';
import { GameRoom } from './game.room';
import {  GameController } from './game.controller';

@Module({
    providers: [GameRoom],
    exports: [GameRoom],
    controllers: [GameController],
})
export class GameModule {}
