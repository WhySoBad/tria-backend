import { IsNotEmpty, IsUUID } from 'class-validator';

export class KickMemberDto {
  @IsNotEmpty()
  @IsUUID(4)
  readonly uuid: string;
}
