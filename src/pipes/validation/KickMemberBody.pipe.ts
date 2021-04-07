import { IsNotEmpty, IsUUID } from 'class-validator';

export class KickMemberBody {
  @IsNotEmpty()
  @IsUUID(4)
  readonly uuid: string;
}
