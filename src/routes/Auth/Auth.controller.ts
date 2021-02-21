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
 * @description auth route to validate tokens, start handshake, login and logout users
 * @introduced 16.02.2021
 * @edited 17.02.2021
 */

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * @param request request instance
   * @description route to validate a JWT
   * @returns Promise<void>
   * @introduced 16.02.2021
   * @edited 17.02.2021
   */

  @Get('validate')
  async validate(@Request() request: Request): Promise<boolean> {
    const token: string = request.headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    const payload = await this.authService.handleVerify(token.substr(7));
    if (payload instanceof HttpException) throw payload;
    else return !!payload;
  }

  /**
   * @param login request body of type ILogin
   * @description route to login an user and generate a JWT
   * @returns Promise<void>
   * @introduced 16.02.2021
   * @edited 17.02.2021
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
   * @param request request instance
   * @description route to logout an user and blacklist the JWT
   * @returns Promise<void>
   * @introduced 16.02.2021
   * @edited 17.02.2021
   */

  @Get('logout')
  async logout(@Request() request: Request): Promise<void> {
    const token: string = request.headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    await this.authService.handleLogout(token.substr(7));
  }
}
