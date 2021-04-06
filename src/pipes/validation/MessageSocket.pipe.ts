import { IsString, IsUUID } from 'class-validator';

export class MessageSocket {
  @IsUUID(4)
  readonly uuid: string;

  @IsUUID(4)
  readonly chat: string;

  @IsString()
  readonly data: string;
}
