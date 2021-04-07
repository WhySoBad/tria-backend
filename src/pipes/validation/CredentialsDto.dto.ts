import { IsNotEmpty, IsString } from 'class-validator';

export class CredentialsDto {
  @IsNotEmpty()
  @IsString()
  readonly username: string;

  @IsNotEmpty()
  @IsString()
  readonly password: string;
}
