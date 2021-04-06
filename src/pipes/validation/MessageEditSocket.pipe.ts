import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class MessageEditSocket {
  @IsUUID(4)
  readonly message: string;

  @IsOptional()
  @IsBoolean()
  readonly pinned: boolean;

  @IsOptional()
  @IsString()
  readonly text: string;
}
