import { IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class ChatEditDto {
  @IsOptional()
  @IsUUID(4)
  readonly actionUuid: string;

  @IsNotEmpty()
  @IsUUID(4)
  readonly chat: string;

  @IsOptional()
  @IsString()
  @ValidateIf((type) => type === 'PUBLIC_GROUP' || type === 'PRIVATE_GROUP')
  type: 'PUBLIC_GROUP' | 'PRIVATE_GROUP';

  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  tag: string;

  @IsOptional()
  @IsString()
  description: string;
}
