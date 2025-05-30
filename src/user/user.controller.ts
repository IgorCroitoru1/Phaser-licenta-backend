import { 
  Controller, 
  Get, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  Req,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserService } from './user.service';
import { UpdateUserDto } from './dtos/update-user.dto';
import { RolesEnum } from './constants/roles.constant';
import { Roles } from '../auth/roles-auth.decorator';
import { plainToInstance } from 'class-transformer';
import { UserDto } from './dtos/user.dto';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  async getProfile(@Req() req: Request): Promise<UserDto> {
    const user = await this.userService.findById(req.user.id);
    return plainToInstance(UserDto, user, { excludeExtraneousValues: true });
  }

  @Put('profile')
  async updateProfile(
    @Req() req: Request,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<UserDto> {
    console.log('Updating user profile:', updateUserDto);
    const updatedUser = await this.userService.updateUser(req.user.id, updateUserDto);
    return plainToInstance(UserDto, updatedUser, { excludeExtraneousValues: true });
  }

  @Delete('profile')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(@Req() req: Request): Promise<void> {
    await this.userService.deleteUser(req.user.id);
  }

  // Admin routes
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(RolesEnum.ADMIN)
  async getUserById(@Param('id') userId: string): Promise<UserDto> {
    const user = await this.userService.findById(userId);
    return plainToInstance(UserDto, user, { excludeExtraneousValues: true });
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(RolesEnum.ADMIN)
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<UserDto> {
    const updatedUser = await this.userService.updateUser(userId, updateUserDto);
    return plainToInstance(UserDto, updatedUser, { excludeExtraneousValues: true });
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RolesEnum.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') userId: string): Promise<void> {
    await this.userService.deleteUser(userId);
  }
}
