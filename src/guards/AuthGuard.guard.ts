import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TokenPayload } from '../modules/Auth/Jwt/Jwt.interface';
import { JwtService } from '../modules/Auth/Jwt/Jwt.service';

@Injectable()
class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    let token; //user auth token
    if (context.getType() == 'http') {
      token = context.switchToHttp().getRequest().headers.authorization; //token in request
    } else if (context.getType() == 'ws') {
      token = context.switchToWs().getClient().handshake.headers.authorization; //token in websocket
    }

    if (!token) return false;
    const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
    if (!payload) return false;
    else return true;
  }
}

export default AuthGuard;
