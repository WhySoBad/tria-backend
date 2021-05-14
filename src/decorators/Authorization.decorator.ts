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
      token = parseCookies(context.switchToWs().getClient().handshake.headers.cookie)?.token;
    }
    token?.replace('Bearer ', '');
    if (!token) throw new BadRequestException('Missing Token');
    const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
    if (!payload) throw new BadRequestException('Invalid Token');
    else return payload;
  }
);

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

export default Authorization;
