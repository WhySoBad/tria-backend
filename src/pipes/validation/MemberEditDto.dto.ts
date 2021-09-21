import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { GroupRole, Permission } from '../../modules/Chat/Chat.interface';

export class MemberEditDto {
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
   * User uuid
   */

  @IsNotEmpty()
  @IsUUID(4)
  readonly user: string;

  /**
   * Role of the member
   */

  @IsNotEmpty()
  @IsString()
  @IsEnum(GroupRole)
  role: GroupRole;

  /**
   * Permissions of the member
   */

  @IsNotEmpty()
  @IsArray()
  @ArrayUnique()
  @IsEnum(Permission, { each: true })
  permissions: Array<Permission>;
}
