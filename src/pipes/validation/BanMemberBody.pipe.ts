import { IsNotEmpty, IsUUID } from 'class-validator';

export class BanMemberBody {
  @IsNotEmpty()
  @IsUUID(4)
  readonly uuid: string;
}
