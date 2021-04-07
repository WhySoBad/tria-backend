import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class MessageEditSocket {
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
