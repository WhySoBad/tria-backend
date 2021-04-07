import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { User } from '../../entities/User.entity';
import { AuthService } from './Auth.service';
import { v4 } from 'uuid';
import Authorization from '../../decorators/Authorization.decorator';
import AuthGuard from '../../guards/AuthGuard';
import { JwtService } from './Jwt/Jwt.service';
import { Credentials } from '../../pipes/validation/Credentials.pipe';
import { TokenPayload, TokenType } from './Jwt/Jwt.interface';

/**
 * Auth controller to validate tokens, start handshake, login and logout users
 */

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private JwtService: JwtService) {}

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
    try {
      return await this.authService.handleValidate(token.substr(7));
    } catch (exception) {
      return false;
    }
  }

  /**
   * Route to login an user and generate a JWT
   *
   * @param credentials credentials of the user
   *
   * @returns Promise<string>
   */

  @Post('login')
  async login(@Body() credentials: Credentials): Promise<string> {
    try {
      const user: User = await this.authService.handleLogin(credentials);
      return JwtService.GenerateToken(
        {
          uuid: v4(),
          user: user.uuid,
          type: TokenType.AUTH,
        },
        TokenType.AUTH
      );
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
