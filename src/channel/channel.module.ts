import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChannelsController } from './channel.controller';
import { ChannelsService } from './channel.service';
import { Channel, ChannelSchema } from './models/channel.model';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { GameModule } from '../game/game.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Channel.name, schema: ChannelSchema }
    ]),
    AuthModule, // Provides JwtService and JwtModule
    UserModule, // Provides UserService
    GameModule, // Provides GameService for live data
  ],
  controllers: [ChannelsController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelModule {}

