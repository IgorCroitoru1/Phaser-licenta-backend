import { Module } from '@nestjs/common';
import { ChannelsGateway } from './channels.gateway';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { GameModule } from '../game/game.module';

@Module({
  imports: [
    AuthModule, // Provides JwtService
    UserModule, // Provides UserService
    GameModule, // Provides GameService for live data
  ],
  providers: [ChannelsGateway],
  exports: [ChannelsGateway],
})
export class GatewayModule {}
