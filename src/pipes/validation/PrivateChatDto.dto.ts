import { IsNotEmpty, IsUUID } from 'class-validator';

export class PrivateChatDto {
  @IsNotEmpty()
  @IsUUID(4)
  readonly user: string;
}
