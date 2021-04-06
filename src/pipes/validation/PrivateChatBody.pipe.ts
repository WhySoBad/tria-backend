import { IsUUID } from 'class-validator';

export class PrivateChatBody {
  @IsUUID(4)
  readonly uuid: string;
}
