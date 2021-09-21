export enum TokenType {
  AUTH = 'AUTH',
  REGISTER = 'REGISTER',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

export interface TokenPayload {
  /**
   * User of the token
   */

  user: string;

  /**
   * Uuid of the token
   */

  uuid: string;

  /**
   * Type of the token
   */

  type: TokenType;

  /**
   * Timestamp when the token was created
   */

  iat: number;

  /**
   * Timestamp when the token expires
   */

  exp: number;
}
