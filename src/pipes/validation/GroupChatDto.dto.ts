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
  @IsNotEmpty()
  @IsString()
  readonly name: string;

  @IsNotEmpty()
  @IsString()
  readonly tag: string;

  @IsNotEmpty()
  @IsEnum(ChatType)
  @NotEquals(ChatType.PRIVATE)
  readonly type: ChatType;

  @IsNotEmpty()
  @IsString()
  readonly description: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayUnique()
  @ValidateNested({ each: true })
  @Type(() => MemberDto)
  readonly members: Array<MemberDto>;
}

class MemberDto {
  @IsNotEmpty()
  @IsUUID()
  @IsString()
  readonly uuid: string;

  @IsNotEmpty()
  @IsEnum(GroupRole)
  @NotEquals('OWNER')
  readonly role: GroupRole;
}
