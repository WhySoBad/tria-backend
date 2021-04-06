import { IsUUID } from 'class-validator';

export class KickMemberBody {
  @IsUUID(4)
  readonly uuid: string;
}
