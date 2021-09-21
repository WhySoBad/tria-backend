import { IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class ChatEditDto {
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
   * Type of the chat
   */

  @IsOptional()
  @IsString()
  @ValidateIf((type) => type === 'GROUP' || type === 'PRIVATE_GROUP')
  type: 'GROUP' | 'PRIVATE_GROUP';

  /**
   * Name of the chat
   */

  @IsOptional()
  @IsString()
  name: string;

  /**
   * Tag of the chat
   */

  @IsOptional()
  @IsString()
  tag: string;

  /**
   * Description of the chat
   */

  @IsOptional()
  @IsString()
  description: string;
}
