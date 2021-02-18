export interface IChatMessage {}

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

export interface IChatAdmin {
  promotedAt: Date;
  permissions: IAdminPermissions;
}

export interface IChatMember {
  joinedAt: Date;
  admin?: IChatAdmin;
  user: {
    uuid: string;
    createdAt: Date;
    role: string;
    name: string;
    tag: string;
    description: string;
    avatar: string;
    locale: string;
  };
}

export interface IChat {
  uuid: string;
  type: string;
  name: string | null;
  tag: string | null;
  description: string | null;
  members: Array<IChatMember>;
  messages: Array<IChatMessage>;
}

export interface IPrivateChat {
  user: string;
}

export interface IGroupChat {
  name: string;
  tag: string;
  description: string;
  members: Array<string>;
}
