export enum GroupRole {
  OWNER = 0,
  ADMIN = 1,
  MEMBER = 2,
}

export enum ChatType {
  PUBLIC_GROUP = 0,
  PRIVATE = 1,
  PRIVATE_GROUP = 2,
}

export enum Permission {
  KICK = 0, //kick users
  BAN = 1, //ban users
  UNBAN = 2, //unban users
  EDIT = 3, //edit chat
  USERS = 4, //edit users
}

export interface ChatPreview {
  uuid: string;
  type: ChatType;
  name: string | null;
  tag: string | null;
  description: string | null;
  size: number;
  online: number;
}

export enum ChatEvent {
  MESSAGE = 'MESSAGE',
  CHAT_EDIT = 'CHAT_EDIT',
  MESSAGE_EDIT = 'MESSAGE_EDIT',
  MEMBER_EDIT = 'MEMBER_EDIT',
  CHAT_DELETE = 'CHAT_DELETE',
  MEMBER_JOIN = 'MEMBER_JOIN',
  MEMBER_LEAVE = 'MEMBER_LEAVE',
  MEMBER_ONLINE = "MEMBER_ONLINE",
  MEMBER_OFFLINE = "MEMBER_OFFLINE",
  MEMBER_BANNED = 'MEMBER_BANNED',
  ACTION_SUCCESS = 'ACTION_SUCCESS',
  ACTION_ERROR = 'ACTION_ERROR',
}
