import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.model';
import { RegisterUserDto } from 'src/auth/dto/register-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

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
  }  async getUsersById(userIds: string[]): Promise<UserDocument[]> {
    return this.userModel.find({ _id: { $in: userIds } }).exec();
  }

  async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<UserDocument> {
    // Check if user exists
    const existingUser = await this.findById(userId);
    if (!existingUser) {
      throw new NotFoundException('Utilizatorul nu a fost găsit');
    }

    // Update the user
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateUserDto },
      { new: true, runValidators: true }
    ).exec();

    if (!updatedUser) {
      throw new NotFoundException('Utilizatorul nu a fost găsit');
    }

    return updatedUser;
  }

  async deleteUser(userId: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(userId).exec();
    if (!result) {
      throw new NotFoundException('Utilizatorul nu a fost găsit');
    }
  }
}