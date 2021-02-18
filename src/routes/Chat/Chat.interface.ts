import { ParseUUIDPipe } from '@nestjs/common';

export enum IChatRole {
  OWNER = 0,
  ADMIN = 1,
  MEMBER = 2,
}

export enum IChatType {
  GROUP = 0,
  PRIVATE = 1,
}

export enum IAdminPermissions {
  KICK = 0,
  BAN = 1,
}

export interface IPrivateChat {
  user: string;
}

export interface IGroupChat {
  name: string;
  tag: string;
  description: string;
  members: Array<{
    uuid: string;
    role: IChatRole;
  }>;
}
