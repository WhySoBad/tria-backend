import { IsNotEmpty, IsString } from 'class-validator';

export class PasswordResetConfirmDto {
  /**
   * Passwordreset token
   */

  @IsNotEmpty()
  @IsString()
  readonly token: string;

  /**
   * New password
   */

  @IsNotEmpty()
  @IsString()
  readonly password: string;
}
