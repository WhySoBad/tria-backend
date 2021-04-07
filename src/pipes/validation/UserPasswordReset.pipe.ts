import { IsEmail, IsNotEmpty } from 'class-validator';

export class UserPasswordReset {
  @IsNotEmpty()
  @IsEmail()
  readonly mail: string;
}
