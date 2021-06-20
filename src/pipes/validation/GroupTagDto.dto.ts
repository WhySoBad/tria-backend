import { IsNotEmpty, IsString } from 'class-validator';

export class GroupTagDto {
  @IsNotEmpty()
  @IsString()
  readonly tag: string;
}
