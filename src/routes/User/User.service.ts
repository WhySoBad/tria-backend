import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { async } from 'rxjs';
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
    private authService: AuthService,
  ) {}

  /**
   *
   * @param pending
   */

  async handleRegister(pending: IPendingUser): Promise<HandleService<void>> {
    let user: PendingUser = new PendingUser();
    const hashed: string = await AuthService.Hash(pending.password);
    user.name = pending.name;
    user.tag = pending.tag;
    user.mail = pending.mail.replace(' ', '');
    user.password = hashed;
    user.description = pending.description;
    user.avatar = pending.avatar;
    user.locale = pending.locale;

    if (await this.pendingUserRepository.findOne({ mail: user.mail })) {
      return new BadRequestException('Mail Has To Be Unique');
    } else if (await this.userRepository.findOne({ mail: user.mail })) {
      return new BadRequestException('Mail Has To Be Unique');
    } else if (await this.pendingUserRepository.findOne({ tag: user.tag })) {
      return new BadRequestException('Tag Has To Be Unique');
    } else if (await this.userRepository.findOne({ tag: user.tag })) {
      return new BadRequestException('Tag Has To Be Unique');
    }
    await this.pendingUserRepository.save(user);
  }

  /**
   *
   * @param uuid
   */

  async handleVerify(uuid: string): Promise<HandleService<void>> {
    const pending: DBResponse<PendingUser> = await this.pendingUserRepository.findOne(
      {
        uuid: uuid,
      },
    );
    if (!pending) return new NotFoundException('User Not Found');
    let user = new User();
    user = { ...user, ...pending };
    user.verified = false;
    await this.userRepository.save(user);
    await this.pendingUserRepository.remove(pending);
  }

  /**
   *
   * @param changes
   * @param token
   */

  async handleEdit(
    changes: IUser,
    token: string,
  ): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(
      token,
    );
    if (payload instanceof HttpException) return payload;
    const user: DBResponse<User> = await this.userRepository.findOne({
      uuid: payload.user,
    });
    if (!user) return new NotFoundException('User Not Found');
    if (changes.tag) {
      if (await this.pendingUserRepository.findOne({ tag: changes.tag })) {
        return new BadRequestException('Tag Has To Be Unique');
      } else if (await this.userRepository.findOne({ tag: changes.tag })) {
        return new BadRequestException('Tag Has To Be Unique');
      }
    }
    await this.userRepository.update(
      { uuid: payload.user },
      { ...user, ...changes },
    );
  }

  /**
   *
   * @param token
   */

  async handleDelete(token: string): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(
      token,
    );
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
   * @param token
   * @description cron task firing every day at 00:00.00 to delete expired pending users
   * @returns Promise<HandleService<User>>
   * @introduced 15.02.2021
   * @edited 16.02.2021
   */

  async handleGet(uuid: string, token: string): Promise<HandleService<User>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(
      token,
    );
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
