import { IsNotEmpty, IsString } from 'class-validator';

export class PasswordChangeDto {
  @IsNotEmpty()
  @IsString()
  readonly old: string;

  @IsNotEmpty()
  @IsString()
  readonly new: string;
}
