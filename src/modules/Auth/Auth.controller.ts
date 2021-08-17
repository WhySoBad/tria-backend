import { BadRequestException, Body, Controller, Get, Post, Request } from '@nestjs/common';
import { v4 } from 'uuid';
import { User } from '../../entities/User.entity';
import { CredentialsDto } from '../../pipes/validation/CredentialsDto.dto';
import { AuthService } from './Auth.service';
import { TokenType } from './Jwt/Jwt.interface';
import { JwtService } from './Jwt/Jwt.service';

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
  async login(@Body() credentials: CredentialsDto): Promise<string> {
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
}
