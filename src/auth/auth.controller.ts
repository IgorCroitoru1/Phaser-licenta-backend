import { Controller, Post, Body, UseGuards, Res, Req, UnauthorizedException, HttpStatus, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response , Request } from 'express';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { COOKIE_SETTINGS, REFRESH_TOKEN_PATH } from '../../constants';
import { UserDto } from 'src/user/dtos/user.dto';
import { UserService } from 'src/user/user.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService,
              private readonly userService: UserService
  ) {}


  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto, @Res() res:Response) {
    const { access_token, refresh_token } = await this.authService.register(registerUserDto);

    res.cookie('refreshToken', refresh_token, COOKIE_SETTINGS.REFRESH_TOKEN);
    return res.json({ access_token });
  }
  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto,@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    console.log(req.cookies);
    const user = await this.authService.validateUser(loginUserDto.email, loginUserDto.password);
    if (!user) {
      throw new UnauthorizedException('Credențiale invalide');
    }

    const { access_token, refresh_token } = await this.authService.login(user);

    res.cookie('refreshToken', refresh_token, COOKIE_SETTINGS.REFRESH_TOKEN);
    const userDto = new UserDto(user.id, user.email, user.fullName, user.roles);
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
    
    // const user = await this.userService.findById()
    return new UserDto(req.user.id, req.user.email, req.user.fullName, req.user.roles);
  }

}
