import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  NotEquals,
} from 'class-validator';
import { ChatType } from '../../modules/Chat/Chat.interface';

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
  @IsUUID(4, { each: true })
  members: Array<string>;
}
