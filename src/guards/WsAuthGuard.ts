import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { TokenPayload } from '../routes/Auth/Auth.interface';
import { AuthService } from '../routes/Auth/Auth.service';

@Injectable()
class WsAuthGuard implements CanActivate {
  constructor(private authServce: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const socket: Socket = context.switchToHttp().getRequest();
    const token: string = socket.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      socket.error('Missing Token');
      return false;
    }
    const payload: TokenPayload | undefined = AuthService.DecodeToken(token);
    if (!payload) {
      socket.error('Invalid Token');
      return false;
    }
    const banned: boolean = await this.authServce.isTokenBanned(payload.uuid);
    if (banned) {
      socket.error('Token Is Banned');
      return false;
    } else return true;
  }
}

export default WsAuthGuard;
