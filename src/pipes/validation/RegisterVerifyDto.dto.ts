import { IsNotEmpty, IsString } from 'class-validator';

export class RegisterVerifyDto {
  /**
   * Registration token
   */

  @IsNotEmpty()
  @IsString()
  readonly token: string;

  /**
   * Name of the user
   */

  @IsNotEmpty()
  @IsString()
  readonly name: string;

  /**
   * Tag of the user
   */

  @IsNotEmpty()
  @IsString()
  readonly tag: string;

  /**
   * Description of the user
   */

  @IsNotEmpty()
  @IsString()
  readonly description: string;

  /**
   * Locale of the user
   */

  @IsNotEmpty()
  @IsString()
  readonly locale: string;
}
