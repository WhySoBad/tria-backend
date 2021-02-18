export interface ILogin {
  username: string;
  password: string;
}

export interface TokenPayload {
  user: string;
  uuid: string;
  iat: number;
  exp: number;
}
