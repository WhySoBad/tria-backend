import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class MessageDto {
  /**
   * Action uuid
   */

  @IsOptional()
  @IsUUID(4)
  readonly actionUuid: string;

  /**
   * Chat uuid
   */

  @IsNotEmpty()
  @IsUUID(4)
  readonly chat: string;

  /**
   * Text of the message
   */

  @IsNotEmpty()
  @IsString()
  readonly data: string;
}
