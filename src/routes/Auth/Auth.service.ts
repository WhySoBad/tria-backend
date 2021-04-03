import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import { SHA256 } from 'crypto-js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/User.entity';
import { ILogin, TokenPayload } from './Auth.interface';
import { DBResponse } from '../../util/Types.type';
import { BlacklistToken } from '../../entities/BlacklistToken.entity';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(BlacklistToken)
    private blacklistRepository: Repository<BlacklistToken>
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
      expiresIn: '90d',
    });
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
   * Function to verify a token
   *
   * Important: This function additionally checks whether the token is banned or not
   *
   * @param token token to be verified
   *
   * @returns Promise<TokenPayload>
   */

  public async verifyToken(token: string): Promise<TokenPayload> {
    const payload: TokenPayload | undefined = AuthService.DecodeToken(token);
    if (!payload) throw new BadRequestException('Invalid Token');
    else {
      const banned: DBResponse<BlacklistToken> = await this.blacklistRepository.findOne({
        uuid: payload.uuid,
      });
      if (banned) throw new UnauthorizedException('Token Is Banned');
      else return payload;
    }
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

  /**
   * Function to logn an user
   *
   * @param login credentials for login (username, password)
   *
   * @returns Promise<User>
   */

  async handleLogin({ username, password }: ILogin): Promise<User> {
    const user: DBResponse<User> = await this.userRepository.findOne({
      mail: username,
    });
    if (!user) throw new NotFoundException('User Not Found');
    const hashed: string = await AuthService.Hash(password);
    if (hashed === user.password) return user;
    else throw new BadRequestException('Invalid Credentials');
  }

  /**
   * Function to logout an user
   *
   * Important: The token gets banned until it's expired
   *
   * @param token jwt to be blacklisted
   *
   * @returns Promise<HandleService<void>>
   */

  async handleLogout(payload: TokenPayload): Promise<void> {
    const { uuid, exp } = payload;
    const user: DBResponse<User> = await this.userRepository.findOne({
      uuid: payload.user,
    });
    if (!user) throw new NotFoundException('User Not Found');
    const banned: DBResponse<BlacklistToken> = await this.blacklistRepository.findOne({
      uuid: uuid,
    });
    if (banned) throw new UnauthorizedException('Token Is Banned');
    let blacklistToken: BlacklistToken = new BlacklistToken();
    blacklistToken.uuid = uuid;
    blacklistToken.expires = new Date(exp * 1000);
    await this.blacklistRepository.save(blacklistToken);
  }

  /**
   * Cron task firing every day at 00:00.00 to delete expired blacklisted tokens
   *
   * @returns Promise<void>
   */

  @Cron('0 0 0 * * 1-7')
  async handleCron(): Promise<void> {
    const tokens: Array<BlacklistToken> = await this.blacklistRepository.find();
    tokens.forEach(async (token: BlacklistToken) => {
      const date: Date = new Date();
      if (token.expires < date) await this.blacklistRepository.remove(token);
    });
  }
}
