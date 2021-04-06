import { ArrayUnique, IsArray, IsEnum, IsString, IsUUID } from 'class-validator';
import { IAdminPermission, IChatRole } from '../../routes/Chat/Chat.interface';

export class MemberEditSocket {
  @IsUUID(4)
  readonly uuid: string;

  @IsUUID(4)
  readonly chat: string;

  @IsUUID(4)
  readonly user: string;

  @IsString()
  @IsEnum(IChatRole)
  role: IChatRole;

  @IsArray()
  @ArrayUnique()
  @IsEnum(IAdminPermission, { each: true })
  permissions: Array<IAdminPermission>;
}
