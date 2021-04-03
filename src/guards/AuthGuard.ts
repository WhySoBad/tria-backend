import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenPayload } from '../routes/Auth/Auth.interface';
import { AuthService } from '../routes/Auth/Auth.service';

@Injectable()
class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token: string = (request.headers as any).authorization;
    if (!token) throw new BadRequestException('Missing Token');
    const payload: TokenPayload | undefined = AuthService.DecodeToken(token);
    if (!payload) throw new BadRequestException('Invalid Token');
    const banned: boolean = await this.authService.isTokenBanned(payload.uuid);
    if (banned) throw new UnauthorizedException('Token Is Banned');
    else return true;
  }
}

export default AuthGuard;
