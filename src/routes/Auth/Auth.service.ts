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
import { DBResponse, HandleService } from '../../util/Types.type';
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
   * @param payload paylod to be stored in token
   * @description static function to generate a 90d JWT for a specific payload
   * @returns Promise<string>
   * @introduced 15.02.2021
   * @edited 18.02.2021
   */

  public static GenerateToken(payload: object | string | Buffer): string {
    if (typeof payload == 'object') JSON.stringify(payload);
    return sign(payload, process.env.TOKEN_SECRET || '', {
      algorithm: 'HS256',
      expiresIn: '90d',
    });
  }

  /**
   * @param text text to be hashed
   * @description static function to hash text with SHA256 algorithm
   * @returns Promise<string>
   * @introduced 15.02.2021
   * @edited 16.02.2021
   */

  public static async Hash(text: string): Promise<string> {
    return SHA256(text as string).toString();
  }

  /**
   * @param token token to be verified
   * @description function to verify a JWT
   * @returns Promise<HandleService<TokenPayload>>
   * @introduced 15.02.2021
   * @edited 21.02.2021
   */

  public async verifyToken(token: string): Promise<HandleService<TokenPayload>> {
    try {
      const encoded: TokenPayload = verify(token, process.env.TOKEN_SECRET || '') as any;
      const banned: DBResponse<BlacklistToken> = await this.blacklistRepository.findOne({
        uuid: encoded.uuid,
      });
      if (banned) return new UnauthorizedException('Token Is Banned');
      else return encoded;
    } catch (err) {
      return new BadRequestException('Invalid Token');
    }
  }

  /**
   * @param token token to be verified
   * @description function to verify a JWT
   * @returns Promise<HandleService<boolean>>
   * @introduced 16.02.2021
   * @edited 16.02.2021
   */

  async handleVerify(token: string): Promise<HandleService<boolean>> {
    const payload: HandleService<TokenPayload> = await this.verifyToken(token);
    if (payload instanceof HttpException) {
      if (payload.message == 'Invalid Token') return false;
      else return payload;
    } else return true;
  }

  /**
   * @param login credentials for login (username, password)
   * @description function to login an user
   * @returns Promise<HandleService<User>>
   * @introduced 16.02.2021
   * @edited 16.02.2021
   */

  async handleLogin({ username, password }: ILogin): Promise<HandleService<User>> {
    const user: DBResponse<User> = await this.userRepository.findOne({
      mail: username,
    });
    if (!user) return new NotFoundException('User Not Found');
    const hashed: string = await AuthService.Hash(password);
    if (hashed === user.password) return user;
    else return new BadRequestException('Invalid Credentials');
  }

  /**
   * @param token usertoken to be blacklisted
   * @description function to logout an user by blacklisting it's token
   * @returns Promise<HandleService<void>>
   * @introduced 16.02.2021
   * @edited 16.02.2021
   */

  async handleLogout(token: string): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.verifyToken(token);
    if (payload instanceof HttpException) return payload;
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
   * @description cron task firing every day at 00:00.00 to delete expired blacklisted tokens
   * @returns Promise<void>
   * @introduced 17.02.2021
   * @edited 17.02.2021
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
