import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SearchDto {
  /**
   * Search query text
   */

  @IsString()
  readonly text: string;

  /**
   * Boolean whether users should be searched
   */

  @IsBoolean()
  @IsOptional()
  readonly checkUser: boolean;

  /**
   * Boolean whether chats should be searched
   */

  @IsBoolean()
  @IsOptional()
  readonly checkChat: boolean;

  /**
   * Boolean whether uuids should be checked
   */

  @IsBoolean()
  @IsOptional()
  readonly checkUuid: boolean;

  /**
   * Boolean whether tags should be checked
   */

  @IsBoolean()
  @IsOptional()
  readonly checkTag: boolean;

  /**
   * Boolean whether names should be checked
   */

  @IsBoolean()
  @IsOptional()
  readonly checkName: boolean;
}
