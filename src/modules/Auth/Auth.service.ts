import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/User.entity';
import { DBResponse } from '../../util/Types.type';
import { BlacklistToken } from '../../entities/BlacklistToken.entity';
import { Cron } from '@nestjs/schedule';
import { JwtService } from './Jwt/Jwt.service';
import { Credentials } from '../../pipes/validation/Credentials.pipe';
import { TokenPayload } from './Jwt/Jwt.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(BlacklistToken)
    private blacklistRepository: Repository<BlacklistToken>,
    private jwtService: JwtService
  ) {}

  /**
   * Function to validate a jwt
   *
   * @param token current user token
   *
   * @returns Promise<boolean>
   */

  async handleValidate(token: string): Promise<boolean> {
    const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
    if (!payload) return false;
    return !(await this.jwtService.isTokenBanned(payload.uuid));
  }

  /**
   * Function to logn an user
   *
   * @param login credentials for login (username, password)
   *
   * @returns Promise<User>
   */

  async handleLogin({ username, password }: Credentials): Promise<User> {
    const user: DBResponse<User> = await this.userRepository.findOne({
      mail: username,
    });
    if (!user) throw new NotFoundException('User Not Found');
    const hashed: string = await JwtService.Hash(password);
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
    const banned: boolean = await this.jwtService.isTokenBanned(uuid);
    if (banned) throw new UnauthorizedException('Token Is Banned');
    const blacklistToken: BlacklistToken = new BlacklistToken();
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
