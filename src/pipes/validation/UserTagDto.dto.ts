import { IsNotEmpty, IsString } from 'class-validator';

export class UserTagDto {
  @IsNotEmpty()
  @IsString()
  readonly tag: string;
}
