import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SHA256 } from 'crypto-js';
import { sign, verify } from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { config } from '../../../config';
import { BlacklistToken } from '../../../entities/BlacklistToken.entity';
import { TokenPayload } from '../Auth.interface';

@Injectable()
export class JwtService {
  constructor(
    @InjectRepository(BlacklistToken) private blacklistRepository: Repository<BlacklistToken>
  ) {}

  /**
   * Function to generate a 90d valid jwt for a specific payload
   *
   * @param payload paylod to be stored in token
   *
   * @returns Promise<string>
   */

  public static GenerateToken(payload: object | string | Buffer): string {
    if (typeof payload == 'object') JSON.stringify(payload);
    return sign(payload, process.env.TOKEN_SECRET || '', {
      algorithm: 'HS256',
      expiresIn: config.tokenExpires,
    });
  }

  /**
   * Function to decode a jwt
   *
   * Important: This function doesn't check whether the token is banned or not
   *
   * @param token token to be decoded
   *
   * @returns TokenPayload | undefined
   */

  public static DecodeToken(token: string): TokenPayload | undefined {
    try {
      return verify(token.replace('Bearer ', ''), process.env.TOKEN_SECRET || '') as any;
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

  /**
   * Function to check whether a token is banned or not
   *
   * @param uuid uuid of the token
   *
   * @returns Promise<boolean>
   */

  public async isTokenBanned(uuid: string): Promise<boolean> {
    return !!(await this.blacklistRepository.findOne({
      uuid: uuid,
    }));
  }
}
