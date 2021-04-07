import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  NotEquals,
} from 'class-validator';
import { IChatType } from '../../modules/Chat/Chat.interface';

export class GroupChatBody {
  @IsNotEmpty()
  @IsString()
  readonly name: string;

  @IsNotEmpty()
  @IsString()
  readonly tag: string;

  @IsNotEmpty()
  @IsEnum(IChatType)
  @NotEquals(IChatType.PRIVATE)
  readonly type: IChatType;

  @IsNotEmpty()
  @IsString()
  readonly description: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayUnique()
  @IsUUID(4, { each: true })
  members: Array<string>;
}
