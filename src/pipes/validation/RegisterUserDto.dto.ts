import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RegisterUserDto {
  /**
   * Mail address
   */

  @IsNotEmpty()
  @IsEmail()
  readonly mail: string;

  /**
   * Password
   */

  @IsNotEmpty()
  @IsString()
  readonly password: string;
}
