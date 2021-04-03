import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { TokenPayload } from '../routes/Auth/Auth.interface';
import { AuthService } from '../routes/Auth/Auth.service';

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
  (data: unknown, context: ExecutionContext): TokenPayload => {
    const request: Request = context.switchToHttp().getRequest();
    const token: string = (request.headers as any).authorization;
    if (!token) throw new BadRequestException('Missing Token');
    const payload: TokenPayload | undefined = AuthService.DecodeToken(token);
    if (!payload) throw new BadRequestException('Invalid Token');
    else return payload;
  }
);
export default Authorization;
