import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

/**
 * Message decorator
 *
 * Automatically checks if the body contains all parameters for a new message
 *
 * data out of it
 *
 * @returns TokenPayload
 */

const Message = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const { chat, data } = context.switchToWs().getData() || {};
  if (!chat || !data) throw new WsException('Missing Arguments');
  else return { chat: chat, data: data };
});

export default Message;
