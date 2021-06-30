import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SearchDto {
  @IsString()
  readonly text: string;

  @IsBoolean()
  @IsOptional()
  readonly checkUser: boolean;

  @IsBoolean()
  @IsOptional()
  readonly checkChat: boolean;

  @IsBoolean()
  @IsOptional()
  readonly checkUuid: boolean;

  @IsBoolean()
  @IsOptional()
  readonly checkTag: boolean;

  @IsBoolean()
  @IsOptional()
  readonly checkName: boolean;
}
