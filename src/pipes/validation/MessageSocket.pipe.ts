import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class MessageSocket {
  @IsNotEmpty()
  @IsUUID(4)
  readonly uuid: string;

  @IsNotEmpty()
  @IsUUID(4)
  readonly chat: string;

  @IsNotEmpty()
  @IsString()
  readonly data: string;
}
