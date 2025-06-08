import { Module } from '@nestjs/common';
import { ChannelsGateway } from './channels.gateway';
import { SimpleGateway } from './simple.gateway';
import { ChannelRoomService } from './channel-room.service';
import { GatewayController } from './gateway.controller';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { GameModule } from '../game/game.module';
import { LivekitModule } from '../livekit/livekit.module';

@Module({
  imports: [
    AuthModule, // Provides JwtService
    UserModule, // Provides UserService
    GameModule, // Provides GameService for live data
    LivekitModule, // Provides LivekitService for token generation
  ],  providers: [
    ChannelsGateway,
    SimpleGateway,
    ChannelRoomService,
  ],
  controllers: [GatewayController],
  exports: [
    ChannelsGateway,
    SimpleGateway,
    ChannelRoomService,
  ],
})
export class GatewayModule {}
