import { IsNotEmpty, IsUUID } from 'class-validator';

export class BanMemberDto {
  /**
   * Uuid of the chat
   */

  @IsNotEmpty()
  @IsUUID(4)
  readonly uuid: string;
}
