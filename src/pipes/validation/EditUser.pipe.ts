import { IsOptional, IsString, IsUrl } from 'class-validator';

export class EditUser {
  @IsOptional()
  @IsString()
  readonly name: string;

  @IsOptional()
  @IsString()
  readonly tag: string;

  @IsOptional()
  @IsString()
  readonly description: string;

  @IsOptional()
  @IsUrl()
  readonly avatar: string;

  @IsOptional()
  @IsString()
  readonly locale: string;
}
