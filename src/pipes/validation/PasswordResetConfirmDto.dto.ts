import { IsNotEmpty, IsString } from 'class-validator';

export class PasswordResetConfirmDto {
  @IsNotEmpty()
  @IsString()
  readonly token: string;

  @IsNotEmpty()
  @IsString()
  readonly password: string;
}
