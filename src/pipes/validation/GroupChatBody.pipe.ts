import {
  ArrayUnique,
  IsArray,
  IsEnum,
  isString,
  IsString,
  IsUUID,
  NotEquals,
} from 'class-validator';
import { IChatType } from '../../routes/Chat/Chat.interface';

export class GroupChatBody {
  @IsString()
  readonly name: string;

  @IsString()
  readonly tag: string;

  @IsEnum(IChatType)
  @NotEquals(IChatType.PRIVATE)
  readonly type: IChatType;

  @IsString()
  readonly description: string;

  @IsArray()
  @ArrayUnique()
  @IsUUID(4, { each: true })
  members: Array<string>;
}
