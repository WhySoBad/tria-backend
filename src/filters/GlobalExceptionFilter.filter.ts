import { ArgumentsHost, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';

export class GlobalExceptionFilter implements ExceptionFilter {
  private logger: Logger = new Logger('GlobalExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const context: HttpArgumentsHost = host.switchToHttp();

    const response: Response = context.getResponse<Response>();

    if (!(exception instanceof HttpException)) {
      this.logger.log(`Received unknown exception`);
      this.logger.log(exception);
      response
        .status(500)
        .json({ statusCode: 500, message: 'Unknown Error', error: 'Internal Server Error' });
      return;
    }

    const exceptionResponse: any = exception.getResponse();
    const error: string = exceptionResponse.error;
    const statusCode: number = exceptionResponse.statusCode;
    const message: string | Array<string> = exceptionResponse.message;

    const final: string = capitalizeMessage(Array.isArray(message) ? message.join(', ') : message);
    response.status(statusCode).json({ statusCode: statusCode, message: final, error: error });
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
