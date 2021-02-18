import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Request,
} from '@nestjs/common';
import { User } from '../../entities/User.entity';
import { HandleService } from '../../util/Types.type';
import { ILogin } from './Auth.interface';
import { AuthService } from './Auth.service';
import { v4 } from 'uuid';

/**
 *
 */

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   *
   * @param request
   */

  @Get('validate')
  async validate(@Request() request: Request): Promise<boolean> {
    const headers: Headers = request.headers;
    const token: string = headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    const payload = await this.authService.handleVerify(
      token.replace('Bearer ', ''),
    );
    if (payload instanceof HttpException) throw payload;
    else return !!payload;
  }

  /**
   *
   */

  @Get('handshake')
  async handshake() {}

  /**
   *
   * @param login
   */

  @Post('login')
  async login(@Body() login: ILogin): Promise<string> {
    if (!login.username || !login.password) {
      throw new BadRequestException('Missing Credentials');
    }
    const user: HandleService<User> = await this.authService.handleLogin(login);
    if (user instanceof HttpException) throw user;
    return AuthService.GenerateToken({
      uuid: v4(),
      user: user.uuid,
    });
  }

  /**
   *
   * @param request
   */

  @Get('logout')
  async logout(@Request() request: Request): Promise<void> {
    const headers: Headers = request.headers;
    const token: string = headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    await this.authService.handleLogout(token.replace('Bearer ', ''));
  }
}
