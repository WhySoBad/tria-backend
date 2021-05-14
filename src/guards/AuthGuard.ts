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
      token = parseCookies(context.switchToWs().getClient().handshake.headers.cookie)?.token;
    }

    if (!token) return false;
    const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
    if (!payload) return false;
    const banned: boolean = await this.jwtService.isTokenBanned(payload.uuid);
    if (banned) return false;
    else return true;
  }
}

/**
 * Function to parse the cookies of an incoming request
 *
 * @param cookies cookies string
 *
 * @returns object
 */

const parseCookies: (cookies: string) => { [name: string]: string } = (cookies: string) => {
  const split: Array<string> = cookies.split('; ');
  const parsed: { [name: string]: string } = {};
  split.forEach((cookie: string) => {
    const split: Array<string> = cookie.split('=');
    parsed[split[0]] = split[1];
  });
  return parsed;
};

export default AuthGuard;
