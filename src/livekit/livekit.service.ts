// src/livekit/livekit.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class LivekitService {
  private apiKey: string;
  private apiSecret: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LIVEKIT_API_KEY');
    this.apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET');
  }

  generateToken(identity: string, room: string, name?: string): Promise<string> {
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity,
      name,
    });

    token.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
    });

    return token.toJwt(); // Signed token
  }
}
