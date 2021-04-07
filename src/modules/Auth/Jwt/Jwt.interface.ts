export enum TokenType {
  AUTH = 'AUTH',
  REGISTER = 'REGISTER',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

export interface TokenPayload {
  user: string;
  uuid: string;
  type: TokenType;
  iat: number;
  exp: number;
}
