import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TokenPayload } from '../modules/Auth/Jwt/Jwt.interface';
import { JwtService } from '../modules/Auth/Jwt/Jwt.service';

@Injectable()
class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let token;
    if (context.getType() == 'http') {
      token = context.switchToHttp().getRequest().headers.authorization;
    } else if (context.getType() == 'ws') {
      token = context.switchToWs().getClient().handshake.headers.authorization;
    }

    if (!token) return false;
    const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
    if (!payload) return false;
    else return true;
  }
}

export default AuthGuard;
