import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { ChatSocket, IMemberEdit } from '../routes/Chat/Chat.interface';

/**
 * MemberEdit decorator
 *
 * Automatically checks if the body contains all parameters to edit a member
 *
 * data out of it
 *
 * @returns ChatSocket<IMemberEdit>
 */

const MemberEdit = createParamDecorator(
  (_: unknown, context: ExecutionContext): ChatSocket<IMemberEdit> => {
    const {
      chat,
      uuid,
      data: { user, role, permissions },
    } = context.switchToWs().getData() || {};
    if (!chat || !uuid || !user || !role || !permissions)
      throw new WsException('Missing Arguments');
    else
      return { uuid: uuid, chat: chat, data: { user: user, role: role, permissions: permissions } };
  }
);

export default MemberEdit;
