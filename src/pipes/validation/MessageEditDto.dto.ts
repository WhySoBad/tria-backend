import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class MessageEditDto {
  /**
   * Action uuid
   */

  @IsOptional()
  @IsUUID(4)
  readonly actionUuid: string;

  /**
   * Message uuid
   */

  @IsNotEmpty()
  @IsUUID(4)
  readonly message: string;

  /**
   * Text of the message
   */

  @IsOptional()
  @IsString()
  readonly text: string;
}
