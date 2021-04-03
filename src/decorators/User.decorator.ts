import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IUser } from '../routes/User/User.interface';

/**
 * User decorator
 *
 * Automatically checks if the body contains all information to edit an existing user
 *
 * @returns IUser
 */

const User = createParamDecorator(
  (data: unknown, context: ExecutionContext): IUser => {
    const request: Request = context.switchToHttp().getRequest();
    const { name, tag, avatar, description, locale } = (request.body as any) || {};
    if (!name || !tag || !avatar || !description || !locale) {
      throw new BadRequestException('Missing Arguments');
    } else
      return {
        name: name,
        tag: tag,
        avatar: avatar,
        description: description,
        locale: locale,
      };
  }
);

export default User;
