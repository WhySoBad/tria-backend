import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/User.entity';
import { CredentialsDto } from '../../pipes/validation/CredentialsDto.dto';
import { TokenPayload } from './Jwt/Jwt.interface';
import { JwtService } from './Jwt/Jwt.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
    return exists;
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
   * Function to handle a connect
   *
   * @param token user jwt
   *
   * @param update boolean whether the user online status should be updated
   *
   * @returns Promise<User>
   */

  async handleConnect(token: string, update: boolean = true): Promise<User> {
    try {
      const user: User = await this.getUser(token);
      if (update) {
        user.online = true;
        await this.userRepository.save(user);
      }
      return user;
    } catch (exception) {
      throw exception;
    }
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
    try {
      const user: User = await this.getUser(token);
      if (update) {
        user.online = false;
        user.lastSeen = new Date();
        await this.userRepository.save(user);
      }
      return user;
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Function to get an user by its auth token
   *
   * @param token auth token
   *
   * @returns Promise<User>
   */

  async getUser(token: string): Promise<User> {
    const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
    if (!payload) throw new BadRequestException('Invalid Token');

    const user: User | undefined = await this.userRepository
      .createQueryBuilder('user')
      .where('user.uuid = :uuid', { uuid: payload.user })
      .leftJoinAndSelect('user.chats', 'member')
      .leftJoinAndSelect('member.chat', 'chat')
      .leftJoinAndSelect('chat.members', 'members')
      .getOne();
    if (!user) throw new NotFoundException('User Not Found');

    return user;
  }
}
