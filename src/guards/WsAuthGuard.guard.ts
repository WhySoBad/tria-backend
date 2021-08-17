import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { TokenPayload } from '../modules/Auth/Jwt/Jwt.interface';
import { JwtService } from '../modules/Auth/Jwt/Jwt.service';

@Injectable()
class WsAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const socket: Socket = context.switchToHttp().getRequest();
    const token: string = socket.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      socket.error('Missing Token');
      return false;
    }
    const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
    if (!payload) {
      socket.error('Invalid Token');
      return false;
    }
    return true;
  }
}

export default WsAuthGuard;
