import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameModule } from './game/game.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ChannelModule } from './channel/channel.module';
import { MongooseModule } from '@nestjs/mongoose';
import { LivekitModule } from './livekit/livekit.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot('mongodb://localhost:27017/phaser_chat'),
    GameModule,
    UserModule,
    AuthModule,
    ChannelModule,
    LivekitModule,
    ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
