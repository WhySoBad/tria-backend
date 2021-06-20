import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class UserMailDto {
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  readonly mail: string;
}
