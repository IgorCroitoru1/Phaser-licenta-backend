import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserSchema } from 'src/user/user.model';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UserModule } from 'src/user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Token, TokenSchema } from './models/token.model';
import { EmailVerification, EmailVerificationSchema } from './models/email-verification.model';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmailService } from './services/email.service';
import { EmailVerificationService } from './services/email-verification.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Token.name, schema: TokenSchema },
      { name: EmailVerification.name, schema: EmailVerificationSchema }
    ]),
    UserModule,
    PassportModule,
    ConfigModule,
    // JWT is now configured globally in AppModule, so we don't need it here
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, EmailService, EmailVerificationService],
  exports: [AuthService, JwtAuthGuard, EmailService, EmailVerificationService], // Export services for use in other modules
})
export class AuthModule {}
