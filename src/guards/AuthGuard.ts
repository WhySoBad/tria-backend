import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenPayload } from '../routes/Auth/Auth.interface';
import { JwtService } from '../routes/Auth/Jwt/Jwt.service';

@Injectable()
class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let token;
    if (context.getType() == 'http') {
      token = context.switchToHttp().getRequest().headers.authorization;
    } else if (context.getType() == 'ws') {
      token = context.switchToHttp().getRequest().handshake.headers.authorization;
    }
    token?.replace('Bearer ', '');
    if (!token) return false;
    const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
    if (!payload) return false;
    const banned: boolean = await this.jwtService.isTokenBanned(payload.uuid);
    if (banned) return false;
    else return true;
  }
}

export default AuthGuard;
