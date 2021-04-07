import { IsNotEmpty, IsString } from 'class-validator';

export class UserPasswordResetConfirm {
  @IsNotEmpty()
  @IsString()
  readonly token: string;

  @IsNotEmpty()
  @IsString()
  readonly password: string;
}
