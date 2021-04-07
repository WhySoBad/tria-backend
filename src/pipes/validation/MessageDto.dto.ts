import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class MessageDto {
  @IsOptional()
  @IsUUID(4)
  readonly actionUuid: string;

  @IsNotEmpty()
  @IsUUID(4)
  readonly chat: string;

  @IsNotEmpty()
  @IsString()
  readonly data: string;
}
