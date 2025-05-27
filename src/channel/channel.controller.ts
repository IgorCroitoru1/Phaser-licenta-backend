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
  Query,
  UseGuards, 
  Req
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ChannelsService } from './channel.service';
import { GameService } from '../game/game.service';
import { CreateChannelDto } from './dtos/create-channel.dto';
import { UpdateChannelDto } from './dtos/update-channel.dto';
import { RolesEnum } from 'src/user/constants/roles.constant';
import { Roles } from 'src/auth/roles-auth.decorator';
import { Request } from 'express';

@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(
    private readonly channelsService: ChannelsService,
    private readonly gameService: GameService
  ) {}
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

  // Live data endpoints for real-time channel statistics
  @Get('live/data')
  async getChannelsLiveData() {
    return this.gameService.getChannelsLiveData();
  }

  @Get(':id/live/data')
  async getChannelLiveData(@Param('id') channelId: string) {
    return this.gameService.getChannelLiveData(channelId);
  }

  // Long polling endpoint for real-time updates
  @Get('live/poll')
  async longPollChannelUpdates(
    @Query('timestamp') timestamp?: string,
    @Query('timeout') timeout?: string
  ) {
    const lastTimestamp = timestamp ? parseInt(timestamp, 10) : undefined;
    const timeoutMs = timeout ? parseInt(timeout, 10) : 30000; // Default 30 seconds
    
    return this.gameService.waitForChannelChanges(lastTimestamp, timeoutMs);
  }

  // Enhanced channels list with live data
  @Get('with-live-data')
  async findAllWithLiveData() {
    const [channels, liveData] = await Promise.all([
      this.channelsService.findAll(),
      this.gameService.getChannelsLiveData()
    ]);

    // Merge channel data with live statistics
    const channelsWithLiveData = channels.map(channel => {
      const channelLiveData = liveData.find(live => live.channelId === channel.id);
      return {
        ...channel,
        liveData: channelLiveData || {
          channelId: channel.id,
          clientsCount: 0,
          roomsCount: 0,
          isActive: false
        }
      };
    });

    return channelsWithLiveData;
  }
}