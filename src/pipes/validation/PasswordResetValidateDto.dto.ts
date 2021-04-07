import { IsNotEmpty, IsString } from 'class-validator';

export class PasswordResetValidateDto {
  @IsNotEmpty()
  @IsString()
  readonly token: string;
}
