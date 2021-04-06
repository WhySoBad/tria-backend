import { IsUUID } from 'class-validator';

export class BanMemberBody {
  @IsUUID(4)
  readonly uuid: string;
}
