import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const socket: Socket = host.switchToHttp().getRequest();
    const token: string = socket.handshake.headers.authorization?.replace('Bearer ', '');
    const client: Socket = host.switchToWs().getClient();
    const data = host.switchToWs().getData();

    const statusCode: number = exception.getStatus();
    const response: any = exception.getResponse() as any;
    const message: string | Array<string> = response.message;
    if (exception instanceof HttpException) {
      if (Array.isArray(message)) {
        const error: string = message
          .join(', ')
          .split(' ')
          .map((section: string) => section[0].toUpperCase() + section.substr(1))
          .join(' ');

        return socket.error({ statusCode: statusCode, message: error, error: response.error });
      } else return socket.error(exception.getResponse());
    } else
      return socket.error({
        statusCode: 500,
        message: 'Unknown Error',
        error: 'Internal Server Error',
      });
  }
}

export default WsExceptionFilter;
