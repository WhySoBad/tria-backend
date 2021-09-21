import { IsNotEmpty, IsUUID } from 'class-validator';

export class KickMemberDto {
  /**
   * Uuid of the user
   */

  @IsNotEmpty()
  @IsUUID(4)
  readonly uuid: string;
}
