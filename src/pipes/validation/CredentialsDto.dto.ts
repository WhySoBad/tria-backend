import { IsNotEmpty, IsString } from 'class-validator';

export class CredentialsDto {
  /**
   * Username of the user
   */

  @IsNotEmpty()
  @IsString()
  readonly username: string;

  /**
   * Password of the user
   */

  @IsNotEmpty()
  @IsString()
  readonly password: string;
}
