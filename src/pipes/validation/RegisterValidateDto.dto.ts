import { IsNotEmpty, IsString } from 'class-validator';

export class RegisterValidateDto {
  @IsNotEmpty()
  @IsString()
  readonly token: string;
}
