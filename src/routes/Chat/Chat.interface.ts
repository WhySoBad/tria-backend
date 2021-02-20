export interface IChatMessage {}

export interface IUserEdit {
  user: string;
  role: IChatRole;
  permissions: Array<IAdminPermission>;
}

export interface IChatEdit {
  type?: 'PUBLIC_GROUP' | 'PRIVATE_GROUP';
  name?: string;
  tag?: string;
  description?: string;
}

export enum IChatRole {
  OWNER = 0,
  ADMIN = 1,
  MEMBER = 2,
}

export enum IChatType {
  PUBLIC_GROUP = 0,
  PRIVATE = 1,
  PRIVATE_GROUP = 2,
}

export enum IAdminPermission {
  KICK = 0, //kick users
  BAN = 1, //ban users
  UNBAN = 2, //unban users
  EDIT = 3, //edit chat
  USERS = 4, //edit users
}

export interface IChatAdmin {
  promotedAt: Date;
  permissions: Array<IAdminPermission>;
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

export interface IBannedMember {
  bannedAt: Date;
  user: {
    uuid: string;
    createdAt: Date;
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
  banned: Array<IBannedMember>;
}

export interface IPrivateChat {
  user: string;
}

export interface IGroupChat {
  name: string;
  tag: string;
  type: 'PUBLIC_GROUP' | 'PRIVATE_GROUP';
  description: string;
  members: Array<string>;
}

export interface WSChatMessage {
  chat: string;
  data: string;
}
