import { BadRequestException, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { User } from '../../entities/User.entity';
import { ILogin, TokenPayload } from './Auth.interface';
import { AuthService } from './Auth.service';
import { v4 } from 'uuid';
import Credentials from '../../decorators/Credentials.decorator';
import Authorization from '../../decorators/Authorization.decorator';
import AuthGuard from '../../guards/AuthGuard';

/**
 * Auth controller to validate tokens, start handshake, login and logout users
 */

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Route to validate a jwt
   *
   * @param request request instance
   *
   * @returns Promise<boolean>
   */

  @Get('validate')
  async validate(@Request() request: Request): Promise<boolean> {
    const token: string = request.headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    return !!AuthService.DecodeToken(token.substr(7));
  }

  /**
   * Route to login an user and generate a JWT
   *
   * @param credentials credentials of the user
   *
   * @returns Promise<string>
   */

  @Post('login')
  async login(@Credentials() credentials: ILogin): Promise<string> {
    try {
      const user: User = await this.authService.handleLogin(credentials);
      return AuthService.GenerateToken({
        uuid: v4(),
        user: user.uuid,
      });
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to logout an user and blacklist the JWT
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<void>
   */

  @Get('logout')
  @UseGuards(AuthGuard)
  async logout(@Authorization() payload: TokenPayload): Promise<void> {
    await this.authService.handleLogout(payload);
  }
}
