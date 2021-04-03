import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { ChatSocket, IChatEdit } from '../routes/Chat/Chat.interface';

/**
 * ChatEdit decorator
 *
 * Automatically checks if the body contains all parameters to edit a chat
 *
 * data out of it
 *
 * @returns ChatSocket<IChatEdit>
 */

const ChatEdit = createParamDecorator(
  (_: unknown, context: ExecutionContext): ChatSocket<IChatEdit> => {
    const {
      chat,
      uuid,
      data: { type, name, tag, description },
    } = context.switchToWs().getData() || {};
    const changes: IChatEdit = { type: type, name: name, tag: tag, description: description };
    if (Object.keys(changes).length == 0 || !chat || !uuid) {
      throw new WsException('Missing Arguments');
    } else return { uuid: uuid, chat: chat, data: changes };
  }
);

export default ChatEdit;
