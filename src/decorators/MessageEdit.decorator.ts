import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { IMessageEdit } from '../routes/Chat/Chat.interface';

/**
 * MessageEdit decorator
 *
 * Automatically checks if the body contains all parameters to edit a message
 *
 * data out of it
 *
 * @returns IMessageEdit
 */

const MessageEdit = createParamDecorator(
  (_: unknown, context: ExecutionContext): IMessageEdit => {
    const { message, pinned, text } = context.switchToWs().getData() || {};
    if (!message || !pinned || !text) throw new WsException('Missing Arguments');
    else return { message: message, pinned: pinned, text: text };
  }
);

export default MessageEdit;
