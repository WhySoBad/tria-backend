import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/User.entity';
import { BlacklistToken } from '../../entities/BlacklistToken.entity';
import { Cron } from '@nestjs/schedule';
import { JwtService } from './Jwt/Jwt.service';
import { CredentialsDto } from '../../pipes/validation/CredentialsDto.dto';
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
    const exists: boolean = !!(await this.userRepository.findOne({ uuid: payload.user }));
    if (!exists) return false;
    return !(await this.jwtService.isTokenBanned(payload.uuid));
  }

  /**
   * Function to logn an user
   *
   * @param login credentials for login (username, password)
   *
   * @returns Promise<User>
   */

  async handleLogin({ username, password }: CredentialsDto): Promise<User> {
    const user: User | undefined = await this.userRepository.findOne({
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
    const user: User | undefined = await this.userRepository.findOne({
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
   * Function to handle a connect
   *
   * @param token user jwt
   *
   * @param update boolean whether the user online status should be updated
   *
   * @returns Promise<User>
   */

  async handleConnect(token: string, update: boolean = true): Promise<User> {
    const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
    if (!payload) throw new BadRequestException('Invalid Token');
    const banned: boolean = await this.jwtService.isTokenBanned(payload.uuid);
    if (banned) throw new UnauthorizedException('Token Is Banned');

    const user: User | undefined = await this.userRepository
      .createQueryBuilder('user')
      .where('user.uuid = :uuid', { uuid: payload.user })
      .leftJoinAndSelect('user.chats', 'member')
      .leftJoinAndSelect('member.chat', 'chat')
      .leftJoinAndSelect('chat.members', 'members')
      .getOne();
    if (!user) throw new NotFoundException('User Not Found');
    if (update) {
      user.online = true;
      await this.userRepository.save(user);
    }
    return user;
  }

  /**
   * Function to handle a disconnect
   *
   * @param token user jwt
   *
   * @param update boolean whether the user online status should be updated
   *
   * @returns Promise<User>
   */

  async handleDisconnect(token: string, update: boolean = true): Promise<User> {
    const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
    if (!payload) throw new BadRequestException('Invalid Token');
    const banned: boolean = await this.jwtService.isTokenBanned(payload.uuid);
    if (banned) throw new UnauthorizedException('Token Is Banned');

    const user: User | undefined = await this.userRepository
      .createQueryBuilder('user')
      .where('user.uuid = :uuid', { uuid: payload.user })
      .leftJoinAndSelect('user.chats', 'member')
      .leftJoinAndSelect('member.chat', 'chat')
      .leftJoinAndSelect('chat.members', 'members')
      .getOne();
    if (!user) throw new NotFoundException('User Not Found');
    if (update) {
      user.online = false;
      user.lastSeen = new Date();
      await this.userRepository.save(user);
    }
    return user;
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
      if (new Date(token.expires) < new Date()) await this.blacklistRepository.remove(token);
    });
  }
}
