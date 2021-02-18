import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PendingUser } from '../../entities/PendingUser.entity';
import { User } from '../../entities/User.entity';
import { DBResponse, HandleService } from '../../util/Types.type';
import { TokenPayload } from '../Auth/Auth.interface';
import { AuthService } from '../Auth/Auth.service';
import { IPendingUser, IUser } from './User.interface';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(PendingUser)
    private pendingUserRepository: Repository<PendingUser>,
    private authService: AuthService
  ) {}

  /**
   * @param settings settings of  type IPendingUser
   * @description function to register a new user
   * @returns Promise<HandleService<void>>
   * @introduced 15.02.2021
   * @edited 18.02.2021
   */

  async handleRegister(settings: IPendingUser): Promise<HandleService<void>> {
    let user: PendingUser = new PendingUser();
    const hashed: string = await AuthService.Hash(settings.password);
    user.name = settings.name;
    user.tag = settings.tag;
    user.mail = settings.mail.replace(' ', '');
    user.password = hashed;
    user.description = settings.description;
    user.avatar = settings.avatar;
    user.locale = settings.locale;

    const pendingExists = await this.pendingUserRepository
      .createQueryBuilder()
      .where('LOWER(mail) = LOWER(:mail)', { mail: user.mail })
      .orWhere('LOWER(tag) = LOWER(:tag)', { tag: user.tag })
      .getOne();

    const userExists = await this.userRepository
      .createQueryBuilder()
      .where('LOWER(mail) = LOWER(:mail)', { mail: user.mail })
      .orWhere('LOWER(tag) = LOWER(:tag)', { tag: user.tag })
      .getOne();

    if (pendingExists || userExists) {
      return new BadRequestException('Mail And Tag Have To Be Unique');
    }

    await this.pendingUserRepository.save(user);
  }

  /**
   * @param uuid uuid of PendingUser to be verified
   * @description function to verify an user
   * @returns Promise<HandleService<void>>
   * @introduced 15.02.2021
   * @edited 15.02.2021
   */

  async handleVerify(uuid: string): Promise<HandleService<void>> {
    const pending: DBResponse<PendingUser> = await this.pendingUserRepository.findOne({
      uuid: uuid,
    });
    if (!pending) return new NotFoundException('User Not Found');
    let user = new User();
    user = { ...user, ...pending };
    user.verified = false;
    await this.userRepository.save(user);
    await this.pendingUserRepository.remove(pending);
  }

  /**
   * @param settings settings of type IUser
   * @param token user auth token
   * @description function to edit an user
   * @returns Promise<HandleService<void>>
   * @introduced 15.02.2021
   * @edited 15.02.2021
   */

  async handleEdit(settings: IUser, token: string): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;
    const user: DBResponse<User> = await this.userRepository.findOne({
      uuid: payload.user,
    });
    if (!user) return new NotFoundException('User Not Found');
    if (settings.tag) {
      const tagPending = await this.pendingUserRepository
        .createQueryBuilder()
        .where('LOWER(mail) = LOWER(:mail)', { mail: user.mail })
        .orWhere('LOWER(tag) = LOWER(:tag)', { tag: user.tag })
        .getOne();

      const tagExists = await this.userRepository
        .createQueryBuilder()
        .where('LOWER(mail) = LOWER(:mail)', { mail: user.mail })
        .orWhere('LOWER(tag) = LOWER(:tag)', { tag: user.tag })
        .getOne();

      if (tagExists || tagPending) {
        return new BadRequestException('Tag Has To Be Unique');
      }
    }
    await this.userRepository.update({ uuid: payload.user }, { ...user, ...settings });
  }

  /**
   * @param token user auth token
   * @description function to delete an user
   * @returns Promise<HandleService<void>>
   * @introduced 15.02.2021
   * @edited 15.02.2021
   */

  async handleDelete(token: string): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;
    const user: DBResponse<User> = await this.userRepository.findOne({
      uuid: payload.user,
    });
    if (!user) return new NotFoundException('User Not Found');
    await this.userRepository.remove(user);
  }

  /**
   *
   * @param uuid user uuid
   * @param token user auth token
   * @description cron task firing every day at 00:00.00 to delete expired pending users
   * @returns Promise<HandleService<User>>
   * @introduced 15.02.2021
   * @edited 16.02.2021
   */

  async handleGet(uuid: string, token: string): Promise<HandleService<User>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;
    const user: DBResponse<User> = await this.userRepository.findOne({
      uuid: uuid.toLowerCase(),
    });
    if (!user) return new NotFoundException('User Does Not Exist');
    else return user;
  }

  /**
   * @description cron task firing every day at 00:00.00 to delete expired pending users
   * @returns Promise<void>
   * @introduced 17.02.2021
   * @edited 17.02.2021
   */

  @Cron('0 0 0 * * 1-7')
  async handleCron() {
    const users: Array<PendingUser> = await this.pendingUserRepository.find();
    users.forEach(async (user: PendingUser) => {
      const date: Date = new Date();
      if (user.expires < date) await this.pendingUserRepository.remove(user);
    });
  }
}
