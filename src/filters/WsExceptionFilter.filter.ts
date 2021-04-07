import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ChatEvent } from '../modules/Chat/Chat.interface';

@Catch()
class WsExceptionFilter extends BaseWsExceptionFilter {
  private logger: Logger = new Logger('WsExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const socket: Socket = host.switchToHttp().getRequest();
    const data: any = host.switchToWs().getData();
    const statusCode: number = exception.getStatus();
    const response: any = exception.getResponse() as any;
    const message: string | Array<string> = response.message;
    const final: string = capitalizeMessage(Array.isArray(message) ? message.join(', ') : message);

    if (!(exception instanceof HttpException)) {
      this.logger.log(`Received unknown exception`);
      this.logger.log(exception);
      if (data?.actionUuid) {
        socket.send(ChatEvent.ACTION_ERROR, {
          uuid: data.actionUuid,
          statusCode: 500,
          message: 'Unknown Error',
          error: 'Internal Server Error',
        });
      }
      return socket.error({
        statusCode: 500,
        message: 'Unknown Error',
        error: 'Internal Server Error',
      });
    }

    if (data?.actionUuid) {
      socket.send(ChatEvent.ACTION_ERROR, {
        uuid: data.actionUuid,
        statusCode: statusCode,
        message: final,
        error: response.error,
      });
    }
    return socket.error({ statusCode: statusCode, message: final, error: response.error });
  }
}

/**
 * Function to capitalize the first letter of each word
 *
 * @param message message to be capitalized
 *
 * @returns string
 */

const capitalizeMessage: Function = (message: string): string => {
  return message.replace(/\b\w/g, (l) => l.toUpperCase());
};

export default WsExceptionFilter;
