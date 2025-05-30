import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameModule } from './game/game.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ChannelModule } from './channel/channel.module';
import { MongooseModule } from '@nestjs/mongoose';
import { LivekitModule } from './livekit/livekit.module';
import { GatewayModule } from './gateway/gateway.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(), // Add global event emitter
    MongooseModule.forRoot('mongodb://localhost:27017/phaser_chat'),
    // Global JWT configuration to avoid circular dependencies
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '24h', // Set a reasonable expiration time
        },
      }),
      inject: [ConfigService],
      global: true, // Make JWT service available globally
    }),
    GameModule,
    UserModule,
    AuthModule,
    ChannelModule,
    LivekitModule,
    GatewayModule, // Add the gateway module
    ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
