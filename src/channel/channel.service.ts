// src/channels/channels.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { Channel, ChannelDocument } from './models/channel.model';
import { CreateChannelDto } from './dtos/create-channel.dto';
import { UpdateChannelDto } from './dtos/update-channel.dto';

@Injectable()
export class ChannelsService {
  private readonly mapsDirectory = path.join(process.cwd(), 'data', 'maps');

  constructor(
    @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>,
  ) {}

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

  async create(createChannelDto: CreateChannelDto, userId: string): Promise<ChannelDocument> {
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
    return createdChannel.save();
  }

  async findAll(): Promise<ChannelDocument[]> {
    return this.channelModel
      .find({ isActive: true })
      .populate('createdBy', 'fullName email')
      .exec();
  }

  async findById(id: string): Promise<ChannelDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid channel ID');
    }

    const channel = await this.channelModel
      .findById(id)
      .populate('createdBy', 'fullName email')
      .exec();
    
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    
    return channel;
  }

  async update(id: string, updateChannelDto: UpdateChannelDto): Promise<ChannelDocument> {    if (!Types.ObjectId.isValid(id)) {
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
      .populate('createdBy', 'fullName email')
      .exec();
    
    if (!updatedChannel) {
      throw new NotFoundException('Channel not found');
    }
    
    return updatedChannel;
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

  async deactivate(id: string): Promise<ChannelDocument> {
    return this.update(id, { isActive: false });
  }

  async activate(id: string): Promise<ChannelDocument> {
    return this.update(id, { isActive: true });
  }
}