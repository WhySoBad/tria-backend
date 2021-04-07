import { IsNotEmpty, IsString } from 'class-validator';

export class UserPasswordChange {
  @IsNotEmpty()
  @IsString()
  readonly old: string;

  @IsNotEmpty()
  @IsString()
  readonly new: string;
}
