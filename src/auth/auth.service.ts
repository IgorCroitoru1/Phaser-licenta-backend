import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from 'src/user/user.model';
import { UserService } from 'src/user/user.service';
import { Token, TokenDocument } from './models/token.model';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserDto } from 'src/user/dtos/user.dto';
import { ACCESS_TOKEN_EXPIRATION, REFRESH_TOKEN_EXPIRATION } from '../../constants';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Token.name) private tokenModel: Model<TokenDocument>,
    private readonly userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email, true);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return null;
    }
    delete user.password
    return user;
  }

  async register(registerUserDto: RegisterUserDto) {
    const { fullName, email, password } = registerUserDto;

    // 🚀 Check if user already exists
    const existingUser = await this.userService.findByEmail( email );
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 🔐 Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🛠️ Create and save the new user
    const newUser = await this.userService.create({
      fullName,
      email,
      password: hashedPassword,
    });
    // 🔑 Generate Tokens
    //const payload = { id: newUser._id, email: newUser.email, fullName: newUser.fullName, roles: newUser.roles };
    const accessToken = this.generateAccessToken(newUser);
    const refreshToken = this.generateRefreshToken(newUser);

    // 🔒 Hash refresh token before storing it in the database
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    // 💾 Store Refresh Token in the database
    await this.tokenModel.create({
      user: newUser._id,
      
      refreshToken: hashedRefreshToken,
    });

    return {
      access_token: accessToken,
      
      refresh_token: refreshToken, // ⚠️ This should be stored in a secure HttpOnly cookie
    };
  }
//   async validateGoogleUser(googleId: string, email: string, username: string) {
//     let user = await this.userModel.findOne({ googleId }).exec();

//     if (!user) {
//       user = new this.userModel({ googleId, email, username, roles: ['user'] });
//       await user.save();
//     }

//     return user;
//   }

  async generateJwt(user: any) {
    const payload = { username: user.username, roles: user.roles };
    return { access_token: this.jwtService.sign(payload) };
  }

  generateAccessToken(user: any) {
    return this.jwtService.sign(
      { ...user },
      { expiresIn: ACCESS_TOKEN_EXPIRATION } // Short-lived token
    );
  }

  generateRefreshToken(user: any) {
    return this.jwtService.sign(
      { ...user },
      { expiresIn: REFRESH_TOKEN_EXPIRATION } // Long-lived token
    );
  }

  async login(user: UserDocument) {
    const userData = new UserDto(user.id, user.email, user.fullName, user.roles);
    const accessToken = this.generateAccessToken(userData);
    const refreshToken = this.generateRefreshToken(userData);

    // Store refresh token securely (hash it before saving)
    await this.tokenModel.create({ user: user.id, refreshToken: refreshToken });

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  async refreshToken(oldRefreshToken: string) {
    const storedToken = await this.tokenModel.findOne({ refreshToken: oldRefreshToken }).exec();

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const decoded = this.jwtService.verify(storedToken.refreshToken);
    console.log("Decoded token", decoded);
    const user = await this.userService.findById(decoded.id);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const userData = new UserDto(user.id, user.email, user.fullName, user.roles);
    const newAccessToken = this.generateAccessToken(userData);
    const newRefreshToken = this.generateRefreshToken(userData);

    // Update stored refresh token
    storedToken.refreshToken = newRefreshToken;
    await storedToken.save();

    return { access_token: newAccessToken, refresh_token: newRefreshToken };
  }

  async logout(refreshToken: string) {
    await this.tokenModel.deleteOne({refreshToken: refreshToken }).exec();
}
}
