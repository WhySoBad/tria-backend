import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    console.log('exception');
    const socket: Socket = host.switchToHttp().getRequest();
    const token: string = socket.handshake.headers.authorization?.replace('Bearer ', '');
    const client: Socket = host.switchToWs().getClient();
    const data = host.switchToWs().getData();
    socket.error(exception?.error || 'Unknown Error');
    console.log(data, exception?.error);
    super.catch(exception, host);
  }
}

export default WsExceptionFilter;
