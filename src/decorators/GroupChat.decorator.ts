import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IGroupChat } from '../routes/Chat/Chat.interface';

/**
 * GroupChat decorator
 *
 * Automatically checks if the body contains all information to create a new GroupChat
 *
 * @returns IGroupChat
 */

const GroupChat = createParamDecorator(
  (data: unknown, context: ExecutionContext): IGroupChat => {
    const request: Request = context.switchToHttp().getRequest();
    const { name, tag, type, description, members } = (request.body as any) || {};
    if (!name || !tag || !type || !description || !members) {
      throw new BadRequestException('Missing User');
    } else
      return {
        name: name,
        tag: tag,
        type: type,
        description: description,
        members: members,
      };
  }
);

export default GroupChat;
