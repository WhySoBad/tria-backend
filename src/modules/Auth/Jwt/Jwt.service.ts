import { Injectable } from '@nestjs/common';
import { SHA256 } from 'crypto-js';
import { sign, verify } from 'jsonwebtoken';
import { config } from '../../../config';
import { TokenPayload, TokenType } from './Jwt.interface';

@Injectable()
export class JwtService {
  constructor() {}

  /**
   * Function to generate a 90d valid jwt for a specific payload
   *
   * @param payload paylod to be stored in token
   *
   * @returns Promise<string>
   */

  public static GenerateToken(payload: object | string | Buffer, type: TokenType): string {
    const SECRETS: { [key: string]: string } = {
      REGISTER: process.env.REGISTER_TOKEN_SECRET || '',
      PASSWORD_RESET: process.env.RESET_TOKEN_SECRET || '',
      AUTH: process.env.AUTH_TOKEN_SECRET || '',
    };

    const DURATIONS: { [key: string]: string } = {
      REGISTER: config.registerTokenExpires,
      PASSWORD_RESET: config.resetTokenExpires,
      AUTH: config.authTokenExpires,
    };

    if (typeof payload == 'object') JSON.stringify(payload);
    return sign(payload, SECRETS[type], {
      algorithm: 'HS256',
      expiresIn: DURATIONS[type],
    });
  }

  /**
   * Function to decode a jwt
   *
   * Important: This function doesn't check whether the token is banned or not
   *
   * @param token token to be decoded
   *
   * @param type type of the token [default = TokenType.AUTH]
   *
   * @returns TokenPayload | undefined
   */

  public static DecodeToken(
    token: string,
    type: TokenType = TokenType.AUTH
  ): TokenPayload | undefined {
    const SECRETS: { [key: string]: string } = {
      REGISTER: process.env.REGISTER_TOKEN_SECRET || '',
      PASSWORD_RESET: process.env.RESET_TOKEN_SECRET || '',
      AUTH: process.env.AUTH_TOKEN_SECRET || '',
    };
    try {
      return verify(token.replace('Bearer ', ''), SECRETS[type] || '') as any;
    } catch (err) {
      return undefined;
    }
  }

  /**
   * Function to hash text with SHA256 algorithm
   *
   * @param text text to be hashed
   *
   * @returns Promise<string>
   */

  public static async Hash(text: string): Promise<string> {
    return SHA256(text as string).toString();
  }
}
