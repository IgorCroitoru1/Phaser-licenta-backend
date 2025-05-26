// src/channels/channels.controller.ts
import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Patch,
  Body, 
  Param, 
  UseGuards, 
  Req
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ChannelsService } from './channel.service';
import { CreateChannelDto } from './dtos/create-channel.dto';
import { UpdateChannelDto } from './dtos/update-channel.dto';
import { RolesEnum } from 'src/user/constants/roles.constant';
import { Roles } from 'src/auth/roles-auth.decorator';
import { Request } from 'express';

@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}
  @UseGuards(RolesGuard)
  @Roles(RolesEnum.ADMIN)
  @Post()
  async create(@Body() createChannelDto: CreateChannelDto, @Req() req: Request) {
    return this.channelsService.create(createChannelDto, req.user.id);
  }
  @Get()
  async findAll() {
    return this.channelsService.findAll();
  }

  @Get('maps')
  async getAvailableMaps() {
    return {
      maps: this.channelsService.getAvailableMaps(),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.channelsService.findById(id);
  }

  @UseGuards(RolesGuard)
  @Roles(RolesEnum.ADMIN)
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateChannelDto: UpdateChannelDto) {
    return this.channelsService.update(id, updateChannelDto);
  }
  @UseGuards(RolesGuard)
  @Roles(RolesEnum.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.channelsService.delete(id);
    return { message: 'Canalul a fost șters cu succes' };
  }

  @UseGuards(RolesGuard)
  @Roles(RolesEnum.ADMIN)
  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.channelsService.deactivate(id);
  }

  @UseGuards(RolesGuard)
  @Roles(RolesEnum.ADMIN)
  @Patch(':id/activate')
  async activate(@Param('id') id: string) {
    return this.channelsService.activate(id);
  }
}