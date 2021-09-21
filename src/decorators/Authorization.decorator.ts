import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TokenPayload } from '../modules/Auth/Jwt/Jwt.interface';
import { JwtService } from '../modules/Auth/Jwt/Jwt.service';

/**
 * Authorization decorator
 *
 * Automatically checks if a jwt is present and gives the encrypted
 *
 * data out of it
 *
 * @returns TokenPayload
 */

const Authorization = createParamDecorator(
  (_: unknown, context: ExecutionContext): TokenPayload => {
    let token;
    if (context.getType() == 'http') {
      token = context.switchToHttp().getRequest().headers.authorization;
    } else if (context.getType() == 'ws') {
      token = context.switchToWs().getClient().handshake.headers.authorization;
    }
    token?.replace('Bearer ', '');
    if (!token) throw new BadRequestException('Missing Token');
    const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
    if (!payload) throw new BadRequestException('Invalid Token');
    else return payload;
  }
);

export default Authorization;
