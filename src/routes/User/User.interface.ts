export interface IUser {
  uuid?: string;
  createdAt?: Date;
  lastSeen?: Date;
  name: string;
  tag: string;
  description: string;
  avatar: string;
  locale: string;
  online?: boolean;
}

export interface IPendingUser {
  name: string;
  tag: string;
  mail: string;
  password: string;
  description: string;
  avatar: string;
  locale: string;
}
