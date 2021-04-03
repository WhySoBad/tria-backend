import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { TokenPayload } from '../routes/Auth/Auth.interface';
import { AuthService } from '../routes/Auth/Auth.service';

/**
 * WsAuthorization decorator
 *
 * Automatically checks if a jwt is present and gives the encrypted
 *
 * data out of it
 *
 * @returns TokenPayload
 */

const WsAuthorization = createParamDecorator(
  (data: unknown, context: ExecutionContext): TokenPayload => {
    const socket: Socket = context.switchToHttp().getRequest();
    const token: string = socket.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      socket.error('Missing Token');
      throw new WsException('Missing Token');
    }
    const payload: TokenPayload | undefined = AuthService.DecodeToken(token);
    if (!payload) {
      socket.error('Invalid Token');
      throw new WsException('Invalid Token');
    } else return payload;
  }
);

export default WsAuthorization;
