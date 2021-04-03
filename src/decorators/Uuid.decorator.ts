import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Uuid decorator
 *
 * Automatically checks if the body contains an uuid
 *
 * @returns string
 */

const Uuid = createParamDecorator((data: unknown, context: ExecutionContext): string => {
  const request: Request = context.switchToHttp().getRequest();
  const { uuid } = (request.body as any) || {};
  if (!uuid) {
    throw new BadRequestException('Missing uuid');
  } else return uuid;
});

export default Uuid;
