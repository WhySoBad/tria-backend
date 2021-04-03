import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IPendingUser } from '../routes/User/User.interface';

/**
 * PendingUser decorator
 *
 * Automatically checks if the body contains all information to create a new PendingUser
 *
 * @returns IPendingUser
 */

const PendingUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): IPendingUser => {
    const request: Request = context.switchToHttp().getRequest();
    const { name, tag, mail, password, avatar, description, locale } = (request.body as any) || {};
    if (!name || !tag || !mail || !password || !avatar || !description || !locale) {
      throw new BadRequestException('Missing Arguments');
    } else
      return {
        name: name,
        tag: tag,
        mail: mail,
        password: password,
        avatar: avatar,
        description: description,
        locale: locale,
      };
  }
);

export default PendingUser;
