export interface IUser {
  uuid?: string;
  createdAt?: Date;
  name: string;
  tag: string;
  description: string;
  avatar: string;
  locale: string;
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
