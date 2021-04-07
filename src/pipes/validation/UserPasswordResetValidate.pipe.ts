import { IsNotEmpty, IsString } from 'class-validator';

export class UserPasswordResetValidate {
  @IsNotEmpty()
  @IsString()
  readonly token: string;
}
