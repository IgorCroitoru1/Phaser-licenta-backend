import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createServer } from 'http';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom, RoomState } from './game/game.room';
import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { UserService } from './user/user.service';
import { JwtService } from '@nestjs/jwt';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) => {
        const formattedErrors = {};
        console.log(errors);
        errors.forEach(error => {
          formattedErrors[error.property] = Object.values(error.constraints);
        });        // 🔴 Throw an exception so NestJS can return the response properly
        throw new BadRequestException({
          message: 'eroare de validare',
          errors: formattedErrors
        });
      },
    }),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: 'http://localhost:8080',
    credentials: true,
  })
  const server = createServer();
  const gameServer = new Server({
    transport: new WebSocketTransport({ server }),
  });
  const userService = app.get(UserService);
  const jwtService = app.get(JwtService);

  // 👇 Inject services into static properties
  GameRoom.userService = userService;
  GameRoom.jwtService = jwtService;
  // gameServer.define('game_room', GameRoom);
  // gameServer.define('game_room2', GameRoom)
  gameServer.define('channel', GameRoom).filterBy(["channelId"])
  await gameServer.listen(2567);
  await app.listen(3000);
}
bootstrap();
