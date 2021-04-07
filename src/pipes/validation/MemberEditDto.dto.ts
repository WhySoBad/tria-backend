import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Permission, GroupRole } from '../../modules/Chat/Chat.interface';

export class MemberEditDto {
  @IsOptional()
  @IsUUID(4)
  readonly actionUuid: string;

  @IsNotEmpty()
  @IsUUID(4)
  readonly chat: string;

  @IsNotEmpty()
  @IsUUID(4)
  readonly user: string;

  @IsNotEmpty()
  @IsString()
  @IsEnum(GroupRole)
  role: GroupRole;

  @IsNotEmpty()
  @IsArray()
  @ArrayUnique()
  @IsEnum(Permission, { each: true })
  permissions: Array<Permission>;
}
