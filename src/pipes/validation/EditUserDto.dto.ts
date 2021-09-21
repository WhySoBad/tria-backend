import { IsOptional, IsString } from 'class-validator';

export class EditUserDto {
  /**
   * Name of the user
   */

  @IsOptional()
  @IsString()
  readonly name: string;

  /**
   * Tag of the user
   */

  @IsOptional()
  @IsString()
  readonly tag: string;

  /**
   * Description of the user
   */

  @IsOptional()
  @IsString()
  readonly description: string;

  /**
   * Locale of the user
   */

  @IsOptional()
  @IsString()
  readonly locale: string;
}
