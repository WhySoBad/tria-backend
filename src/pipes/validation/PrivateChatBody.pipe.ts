import { IsNotEmpty, IsUUID } from 'class-validator';

export class PrivateChatBody {
  @IsNotEmpty()
  @IsUUID(4)
  readonly uuid: string;
}
