export enum GroupRole {
  OWNER = 0,
  ADMIN = 1,
  MEMBER = 2,
}

export enum ChatType {
  GROUP = 0,
  PRIVATE = 1,
  PRIVATE_GROUP = 2,
}

export enum Permission {
  KICK = 0, //kick users
  BAN = 1, //ban users
  UNBAN = 2, //unban users
  CHAT_EDIT = 3, //edit chat
  MEMBER_EDIT = 4, //edit users
}

export interface ChatPreview {
  /**
   * Uuid of the chat
   */

  uuid: string;

  /**
   * Type of the chat
   */

  type: ChatType;

  /**
   * Name of the chat
   */

  name: string | null;

  /**
   * Tag of the chat
   */

  tag: string | null;

  /**
   * Description of the chat
   */

  description: string | null;

  /**
   * Amount of members in the chat
   */

  size: number;

  /**
   * Amount of online members in the chat
   */

  online: number;

  /**
   * Avatar of the chat
   */

  avatar: string | null;
}

export enum ChatEvent {
  MESSAGE = 'MESSAGE',
  CHAT_EDIT = 'CHAT_EDIT',
  MESSAGE_EDIT = 'MESSAGE_EDIT',
  MEMBER_EDIT = 'MEMBER_EDIT',
  CHAT_DELETE = 'CHAT_DELETE',
  MEMBER_JOIN = 'MEMBER_JOIN',
  MEMBER_LEAVE = 'MEMBER_LEAVE',
  MEMBER_ONLINE = 'MEMBER_ONLINE',
  MEMBER_OFFLINE = 'MEMBER_OFFLINE',
  MEMBER_BAN = 'MEMBER_BAN',
  MEMBER_UNBAN = 'MEMBER_UNBAN',
  PRIVATE_CREATE = 'PRIVATE_CREATE',
  GROUP_CREATE = 'GROUP_CREATE',
  ACTION_SUCCESS = 'ACTION_SUCCESS',
  ACTION_ERROR = 'ACTION_ERROR',
  MESSAGE_READ = 'MESSAGE_READ',
}
