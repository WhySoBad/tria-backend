import { IsNotEmpty, IsUUID } from 'class-validator';

export class BanMemberDto {
  @IsNotEmpty()
  @IsUUID(4)
  readonly uuid: string;
}
