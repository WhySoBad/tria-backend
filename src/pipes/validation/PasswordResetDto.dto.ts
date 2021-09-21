import { IsEmail, IsNotEmpty } from 'class-validator';

export class PasswordResetDto {
  /**
   * Mail address
   */

  @IsNotEmpty()
  @IsEmail()
  readonly mail: string;
}
