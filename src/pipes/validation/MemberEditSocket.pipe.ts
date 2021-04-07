import { ArrayUnique, IsArray, IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { IAdminPermission, IChatRole } from '../../modules/Chat/Chat.interface';

export class MemberEditSocket {
  @IsNotEmpty()
  @IsUUID(4)
  readonly uuid: string;

  @IsNotEmpty()
  @IsUUID(4)
  readonly chat: string;

  @IsNotEmpty()
  @IsUUID(4)
  readonly user: string;

  @IsNotEmpty()
  @IsString()
  @IsEnum(IChatRole)
  role: IChatRole;

  @IsNotEmpty()
  @IsArray()
  @ArrayUnique()
  @IsEnum(IAdminPermission, { each: true })
  permissions: Array<IAdminPermission>;
}
