import { Controller, Post, Body, UseGuards, Res, Req, UnauthorizedException, HttpStatus, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response , Request } from 'express';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { RegisterWithCodeDto } from './dto/register-with-code.dto';
import { RequestVerificationCodeDto } from './dto/request-verification-code.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { COOKIE_SETTINGS, REFRESH_TOKEN_PATH } from '../../constants';
import { UserDto } from 'src/user/dtos/user.dto';
import { UserService } from 'src/user/user.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { plainToInstance } from 'class-transformer';
import { EmailVerificationService } from './services/email-verification.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly emailVerificationService: EmailVerificationService
  ) {}
  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    const result = await this.authService.register(registerUserDto);
    return result;
  }

  @Post('request-verification-code')
  async requestVerificationCode(@Body() requestCodeDto: RequestVerificationCodeDto) {
   await this.authService.requestPreRegistrationCode(requestCodeDto.email);

  }

  @Post('register-with-code')
  async registerWithCode(@Body() registerWithCodeDto: RegisterWithCodeDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.registerWithCode(registerWithCodeDto);
    
    // Set refresh token as httpOnly cookie
    if (result.refresh_token) {
      res.cookie('refreshToken', result.refresh_token, COOKIE_SETTINGS.REFRESH_TOKEN);
    }
    
    return {
      access_token: result.access_token,
      user: result.user
    };
  }
  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto,@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateUser(loginUserDto.email, loginUserDto.password);
    if (!user) {
      throw new UnauthorizedException('Credențiale invalide');
    }

    const { access_token, refresh_token } = await this.authService.login(user);

    res.cookie('refreshToken', refresh_token, COOKIE_SETTINGS.REFRESH_TOKEN);
    const userDto = plainToInstance(UserDto, user, { excludeExtraneousValues: true });
    return {
      access_token,
      user: userDto
    };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies['refreshToken'];
    await this.authService.logout(refreshToken);

    res.clearCookie('refreshToken', {path: REFRESH_TOKEN_PATH}); // Remove cookie`
    return res.json({ message: 'Logged out successfully' });
  }

  @Post('refresh')
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies['refreshToken'];
    console.log("Refresh token", token);
    if(!token){
      console.log("Refresh token not found in cookies");
      throw new UnauthorizedException('Neautorizat');
    } 
    const tokens = await  this.authService.refreshToken(token);
    // const user = await use.findById(tokens.user);
    res.cookie('refreshToken', tokens.refresh_token, COOKIE_SETTINGS.REFRESH_TOKEN);

    return res.json({ access_token: tokens.access_token });
  }
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getUser(@Req() req: Request) {
    
     const user = await this.userService.findById(req.user.id, false)
    return plainToInstance(UserDto, user, {excludeExtraneousValues: true});
  }

  @Post('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    const result = await this.emailVerificationService.verifyEmail(
      verifyEmailDto.email, 
      verifyEmailDto.code
    );
    return result;
  }

  @Post('resend-verification')
  async resendVerificationCode(@Body() resendCodeDto: ResendCodeDto) {
    await this.emailVerificationService.resendVerificationCode(resendCodeDto.email);
    return {
      message: 'Codul de verificare a fost retrimis. Verifică-ți email-ul.',
      email: resendCodeDto.email
    };
  }
}
