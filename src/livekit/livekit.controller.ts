// src/livekit/livekit.controller.ts
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { LivekitService } from './livekit.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('livekit')
export class LivekitController {
  constructor(private readonly livekitService: LivekitService) {}

  @UseGuards(JwtAuthGuard)
  @Get('token')
  async getToken(
    @Req() req: Request,
    @Query('room') room: string,
  ) {
    const user = req.user;
    const token = await this.livekitService.generateToken(user.id, room, user.fullName || user.email);
    return { token };
  }
}
