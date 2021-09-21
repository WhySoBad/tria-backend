import { IsNotEmpty, IsString } from 'class-validator';

export class PasswordChangeDto {
  /**
   * Old password
   */

  @IsNotEmpty()
  @IsString()
  readonly old: string;

  /**
   * New password
   */

  @IsNotEmpty()
  @IsString()
  readonly new: string;
}
