import { IsEmail, IsNotEmpty } from 'class-validator';

export class PasswordResetDto {
  @IsNotEmpty()
  @IsEmail()
  readonly mail: string;
}
