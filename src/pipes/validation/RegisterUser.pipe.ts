import { IsEmail, IsString, IsUrl } from 'class-validator';

export class RegisterUser {
  @IsString()
  readonly name: string;

  @IsString()
  readonly tag: string;

  @IsEmail()
  readonly mail: string;

  @IsString()
  readonly password: string;

  @IsString()
  readonly description: string;

  @IsUrl()
  readonly avatar: string;

  @IsString()
  readonly locale: string;
}
