import { IsNotEmpty, IsString } from 'class-validator';

export class Credentials {
  @IsNotEmpty()
  @IsString()
  readonly username: string;

  @IsNotEmpty()
  @IsString()
  readonly password: string;
}
