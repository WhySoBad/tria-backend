import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  NotEquals,
  ValidateNested,
} from 'class-validator';
import { ChatType, GroupRole } from '../../modules/Chat/Chat.interface';

export class GroupChatDto {
  /**
   * Name of the group
   */

  @IsNotEmpty()
  @IsString()
  readonly name: string;

  /**
   * Tag of the group
   */

  @IsNotEmpty()
  @IsString()
  readonly tag: string;

  /**
   * Type of the group
   */

  @IsNotEmpty()
  @IsEnum(ChatType)
  @NotEquals(ChatType.PRIVATE)
  readonly type: ChatType;

  /**
   * Description of the group
   */

  @IsNotEmpty()
  @IsString()
  readonly description: string;

  /**
   * Member of the chat
   */

  @IsNotEmpty()
  @IsArray()
  @ArrayUnique()
  @ValidateNested({ each: true })
  @Type(() => MemberDto)
  readonly members: Array<MemberDto>;
}

class MemberDto {
  /**
   * Uuid of the user
   */

  @IsNotEmpty()
  @IsUUID()
  @IsString()
  readonly uuid: string;

  /**
   * Role of the member
   */

  @IsNotEmpty()
  @IsEnum(GroupRole)
  @NotEquals('OWNER')
  readonly role: GroupRole;
}
