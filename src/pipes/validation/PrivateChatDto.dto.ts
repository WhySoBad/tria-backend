import { IsNotEmpty, IsUUID } from 'class-validator';

export class PrivateChatDto {
  /**
   * Participant uuid
   */

  @IsNotEmpty()
  @IsUUID(4)
  readonly user: string;
}
