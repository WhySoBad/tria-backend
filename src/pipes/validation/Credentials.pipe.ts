import { IsString } from 'class-validator';

export class Credentials {
  @IsString()
  readonly username: string;

  @IsString()
  readonly password: string;
}
