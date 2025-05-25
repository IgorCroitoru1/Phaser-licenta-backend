import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UserDocument } from 'src/user/user.model';
import { UserService } from 'src/user/user.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid token');
    }

    try {
      // Extract and verify JWT token
      const token = authHeader.split(' ')[1];
      const decoded = this.jwtService.verify(token); // Decoded contains user ID
      
      if (!decoded || !decoded.id) {
        throw new UnauthorizedException('Invalid token payload');
      }

      // Fetch user from the database
      const user: UserDocument | null = await this.userService.findById(decoded.id, false);
      if (!user) {
        throw new ForbiddenException('User not found');
      }

      // Attach user to request
      request.user = user;

      return true;
    } catch (error) {
      console.error('JWT validation error:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
