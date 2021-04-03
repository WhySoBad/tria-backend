/**
 * Credentials decorator
 *
 * Automatically checks if the body contains all credentials
 *
 * @returns ILogin
 */

import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ILogin } from '../routes/Auth/Auth.interface';

const Credentials = createParamDecorator(
  (data: unknown, context: ExecutionContext): ILogin => {
    const request: Request = context.switchToHttp().getRequest();
    const { password, username } = (request.body as any) || {};
    if (!password || !username) {
      throw new BadRequestException('Missing Arguments');
    } else
      return {
        username: username,
        password: password,
      };
  }
);

export default Credentials;
