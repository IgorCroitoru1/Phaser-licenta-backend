import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesEnumType } from 'src/user/constants/roles.constant';
import { UserService } from 'src/user/user.service';
import { ROLES_KEY } from '../roles-auth.decorator';
import { Request } from 'express';


@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userService: UserService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Retrieve required roles from metadata
    const requiredRoles = this.reflector.get<RolesEnumType[]>(ROLES_KEY, context.getHandler());
    
    // If no roles required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }   
    const request = context.switchToHttp().getRequest() as Request;
    const decodedUser = request.user; // Should be set by JwtAuthGuard

    // If roles are required but no user is authenticated, deny access
    if (!decodedUser) {
      throw new UnauthorizedException('Authentication required for this resource');
    }

    // Fetch user from database to get current roles - THIS IS WHERE USER IS FETCHED FROM DB
    const user = await this.userService.findById(decodedUser.id, false);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user has roles property
    if (!user.roles || !Array.isArray(user.roles)) {
      throw new ForbiddenException('User roles not found');
    }

    // Convert user roles and required roles to RolesEnum values
    const userRoles = user.roles;

    // Check if user has at least one required role
    const hasRole = userRoles.some(role => requiredRoles.includes(role));
    
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
