import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class MessageEditDto {
  @IsOptional()
  @IsUUID(4)
  readonly actionUuid: string;

  @IsNotEmpty()
  @IsUUID(4)
  readonly message: string;

  @IsOptional()
  @IsBoolean()
  readonly pinned: boolean;

  @IsOptional()
  @IsString()
  readonly text: string;
}
