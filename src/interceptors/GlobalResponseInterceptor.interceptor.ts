import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class GlobalResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const path: string = context.switchToHttp().getRequest().originalUrl;
    return next.handle().pipe(
      map((value) => {
        const hasValue: boolean = value != undefined && value != null;
        const data = hasValue ? { data: value } : {};
        return value;
      })
    );
  }
}
