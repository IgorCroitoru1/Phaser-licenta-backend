// src/channels/channels.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { Channel, ChannelDocument } from './models/channel.model';
import { CreateChannelDto } from './dtos/create-channel.dto';
import { UpdateChannelDto } from './dtos/update-channel.dto';
import { ChannelResponseDto } from './dtos/channel-response.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ChannelsService {
  private readonly mapsDirectory = path.join(process.cwd(), 'data', 'maps');
  constructor(
    @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>,
  ) {
  }

  private validateMapExists(mapName: string): void {
    const fileName = mapName.endsWith('.json') ? mapName : `${mapName}.json`;
    const filePath = path.join(this.mapsDirectory, fileName);
    
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      const availableMaps = this.getAvailableMaps();
      throw new BadRequestException(
        `Harta '${mapName}' nu există. Hărți disponibile: ${availableMaps.join(', ')}`
      );
    }
  }

  getAvailableMaps(): string[] {
    try {
      const files = fs.readdirSync(this.mapsDirectory);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      return [];
    }
  }
  async create(createChannelDto: CreateChannelDto, userId: string): Promise<ChannelResponseDto> {
    // Validate map exists
    this.validateMapExists(createChannelDto.mapName);

    // Check if channel with the same name already exists
    const existingChannel = await this.channelModel.findOne({ 
      name: createChannelDto.name 
    }).exec();
    
    if (existingChannel) {
      throw new ConflictException('Channel with this name already exists');
    }

    const channelData = {
      ...createChannelDto,
      createdBy: new Types.ObjectId(userId),
      maxUsers: createChannelDto.maxUsers || 30,
    };

    const createdChannel = new this.channelModel(channelData);
    const savedChannel = await createdChannel.save();
    
    
    return plainToInstance(ChannelResponseDto, savedChannel, {
      excludeExtraneousValues: true,})
  }
  async findAll(): Promise<ChannelResponseDto[]> {
    const channels = await this.channelModel
      .find({ isActive: true })
      .exec();
    
    return plainToInstance(ChannelResponseDto, channels, {
      excludeExtraneousValues: true,})
  }
  async findById(id: string): Promise<ChannelResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid channel ID');
    }

    const channel = await this.channelModel
      .findById(id)
      .exec();
    
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    
    return plainToInstance(ChannelResponseDto, channel, {
      excludeExtraneousValues: true,});
  }
  async update(id: string, updateChannelDto: UpdateChannelDto): Promise<ChannelResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid channel ID');
    }

    // If updating name, check for conflicts
    if (updateChannelDto.name) {
      const existingChannel = await this.channelModel.findOne({ 
        name: updateChannelDto.name,
        _id: { $ne: id }
      }).exec();
      
      if (existingChannel) {
        throw new ConflictException('Channel with this name already exists');
      }
    }

    // If updating mapName, validate it exists
    if (updateChannelDto.mapName) {
      this.validateMapExists(updateChannelDto.mapName);
    }

    const updatedChannel = await this.channelModel
      .findByIdAndUpdate(id, updateChannelDto, { new: true })
      .exec();
    
    if (!updatedChannel) {
      throw new NotFoundException('Channel not found');
    }
    
    return plainToInstance(ChannelResponseDto, updatedChannel, {
      excludeExtraneousValues: true,});
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid channel ID');
    }

    const result = await this.channelModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException('Channel not found');
    }
  }
  async deactivate(id: string): Promise<ChannelResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid channel ID');
    }

    const deactivatedChannel = await this.channelModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .populate('createdBy', 'fullName email')
      .exec();
    
    if (!deactivatedChannel) {
      throw new NotFoundException('Channel not found');
    }
    
    return plainToInstance(ChannelResponseDto, deactivatedChannel, {
      excludeExtraneousValues: true,});
  }

  async activate(id: string): Promise<ChannelResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid channel ID');
    }

    const activatedChannel = await this.channelModel
      .findByIdAndUpdate(id, { isActive: true }, { new: true })
      .populate('createdBy', 'fullName email')
      .exec();
    
    if (!activatedChannel) {
      throw new NotFoundException('Channel not found');
    }
    
    return plainToInstance(ChannelResponseDto, activatedChannel, {
      excludeExtraneousValues: true,});
    }
}