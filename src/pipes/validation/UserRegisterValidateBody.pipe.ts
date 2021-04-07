import { IsNotEmpty, IsString } from 'class-validator';

export class UserRegisterValidateBody {
  @IsNotEmpty()
  @IsString()
  readonly token: string;
}
