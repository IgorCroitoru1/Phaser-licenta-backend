import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.model';
import { RegisterUserDto } from 'src/auth/dto/register-user.dto';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findById(userId: string, includePassword: boolean = false): Promise<UserDocument | null> {
    const userQuery =   this.userModel.findById(userId);
    if (includePassword) {
      userQuery.select('+password');
    }
    return await userQuery.exec();  
  }
  async findByEmail(email: string,includePassword: boolean = false): Promise<UserDocument | null> {
    const userQuery =   this.userModel.findOne({ email });
    if (includePassword) {
      userQuery.select('+password');
    }
    return await userQuery.exec();
  }
  async create(registerUserDto: RegisterUserDto): Promise<UserDocument> {
    const newUser = new this.userModel(registerUserDto);
    return newUser.save();
  }
  async getUsersById(userIds: string[]): Promise<UserDocument[]> {
    return this.userModel.find({ _id: { $in: userIds } }).exec();
  }
}