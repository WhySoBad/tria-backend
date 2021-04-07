import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RegisterUserBody {
  @IsNotEmpty()
  @IsEmail()
  readonly mail: string;

  @IsNotEmpty()
  @IsString()
  readonly password: string;
}
