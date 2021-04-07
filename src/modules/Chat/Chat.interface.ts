export interface IChatMessage {
  uuid: string;
  sender: string;
  chat: string;
  createdAt: Date;
  editedAt: Date;
  edited: number;
  pinned: boolean;
  text: string;
}

export interface IMemberEdit {
  user: string;
  role: IChatRole;
  permissions: Array<IAdminPermission>;
}

export interface IMessageEdit {
  message: string;
  pinned: boolean;
  text: string;
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

export interface IChatPreview {
  uuid: string;
  type: IChatType;
  name: string | null;
  tag: string | null;
  description: string | null;
  size: number;
  online: number;
}

export interface IGroupChat {
  name: string;
  tag: string;
  type: 'PUBLIC_GROUP' | 'PRIVATE_GROUP';
  description: string;
  members: Array<string>;
}

export interface ChatSocket<T> {
  uuid: string;
  chat: string;
  data: T;
}

export enum ChatEvent {
  MESSAGE = 'MESSAGE',
  CHAT_EDIT = 'CHAT_EDIT',
  MESSAGE_EDIT = 'MESSAGE_EDIT',
  MEMBER_EDIT = 'MEMBER_EDIT',
  CHAT_DELETE = 'CHAT_DELETE',
  MEMBER_JOIN = 'MEMBER_JOIN',
  MEMBER_LEAVE = 'MEMBER_LEAVE',
  MEMBER_BANNED = 'MEMBER_BANNED',
}
