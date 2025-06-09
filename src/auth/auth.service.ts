import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from 'src/user/user.model';
import { UserService } from 'src/user/user.service';
import { Token, TokenDocument } from './models/token.model';
import { RegisterUserDto } from './dto/register-user.dto';
import { RegisterWithCodeDto } from './dto/register-with-code.dto';
import { UserDto } from 'src/user/dtos/user.dto';
import { ACCESS_TOKEN_EXPIRATION, REFRESH_TOKEN_EXPIRATION } from '../../constants';
import { plainToInstance } from 'class-transformer';
import { EmailVerificationService } from './services/email-verification.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Token.name) private tokenModel: Model<TokenDocument>,
    private readonly userService: UserService,
    private jwtService: JwtService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}
  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email, true);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return null;
    }
    
    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Te rugăm să îți verifici email-ul înainte de a te conecta');
    }
    
    delete user.password
    return user;
  } 
  async register(registerUserDto: RegisterUserDto) {
    const { fullName, email, password } = registerUserDto;

    // 🚀 Check if user already exists
    const existingUser = await this.userService.findByEmail( email );
    if (existingUser) {
      throw new ConflictException('Un cont cu această adresă de email există deja');
    }

    // 🔐 Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🛠️ Create and save the new user (unverified)
    const newUser = await this.userService.create({
      fullName,
      email,
      password: hashedPassword,
    });

    // 📧 Send verification email instead of returning tokens
    await this.emailVerificationService.sendVerificationCode(
      newUser._id.toString(), 
      email, 
      fullName
    );

    return {
      message: 'Contul a fost creat cu succes! Verifică-ți email-ul pentru a primi codul de verificare.',
      email: email,
      requiresVerification: true
    };
  }

  /**
   * Send pre-registration verification code to email
   */
  async requestPreRegistrationCode(email: string):Promise<void> {
    await this.emailVerificationService.sendPreRegistrationCode(email);
    
  }
  /**
   * Complete registration with verification code
   */
  async registerWithCode(registerWithCodeDto: RegisterWithCodeDto) {
    const { fullName, email, password, verificationCode } = registerWithCodeDto;

    // Verify the pre-registration code
    const isCodeValid = await this.emailVerificationService.verifyPreRegistrationCode(
      email, 
      verificationCode
    );

    if (!isCodeValid) {
      throw new UnauthorizedException('Codul de verificare este invalid sau a expirat');
    }

    // Check if user already exists (double-check)
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Un cont cu această adresă de email există deja');
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save the new user
    const newUser = await this.userService.create({
      fullName,
      email,
      password: hashedPassword,
    });

    // Mark email as verified since code was validated
    await this.userService.markEmailAsVerified(newUser.id);

    // Complete the verification process
    await this.emailVerificationService.completeVerification(email, newUser.id);

    // Get the updated user with verification status
    const verifiedUser = await this.userService.findById(newUser.id);

    // Generate tokens for immediate login
    const userDto = plainToInstance(UserDto, verifiedUser, { excludeExtraneousValues: true });
    const accessToken = this.generateAccessToken(userDto);
    const refreshToken = this.generateRefreshToken(userDto);

    // Store refresh token
    await this.tokenModel.create({ user: newUser._id, refreshToken: refreshToken });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: userDto
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
    const userData = plainToInstance(UserDto, user, { excludeExtraneousValues: true });
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

    const userData = plainToInstance(UserDto, user, { excludeExtraneousValues: true });
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
