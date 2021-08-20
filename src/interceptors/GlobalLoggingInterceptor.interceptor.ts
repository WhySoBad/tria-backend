import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TokenPayload } from '../modules/Auth/Jwt/Jwt.interface';
import { JwtService } from '../modules/Auth/Jwt/Jwt.service';

@Injectable()
export class GlobalLoggingInterceptor implements NestInterceptor {
  private logger: Logger = new Logger('GlobalLogger');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { statusCode } = response;
    const {
      originalUrl,
      method,
      connection: { remoteAddress },
      headers: { authorization },
    } = request;

    const payload: TokenPayload | undefined = authorization
      ? JwtService.DecodeToken(authorization)
      : undefined;

    const object: { [key: string]: string | undefined } = {
      ip: remoteAddress,
      user: payload?.user,
      url: originalUrl,
      method: method,
      code: statusCode,
    };

    if (object.user === undefined) delete object.user;

    const getObjectString = (): string => {
      return `{ ${Object.entries(object)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')} }`;
    };

    return next.handle().pipe(
      tap({
        next: () => {
          const message: string = `Request succeeded ${getObjectString()}`;
          this.logger.log(message);
        },
        error: (error) => {
          object.message = error.message;
          const message: string = `Request failed ${getObjectString()}`;
          this.logger.log(message);
        },
      })
    );
  }
}
