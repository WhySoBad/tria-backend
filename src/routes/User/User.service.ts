import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PendingUser } from '../../entities/PendingUser.entity';
import { User } from '../../entities/User.entity';
import { EditUser } from '../../pipes/validation/EditUser.pipe';
import { RegisterUser } from '../../pipes/validation/RegisterUser.pipe';
import { DBResponse } from '../../util/Types.type';
import { TokenPayload } from '../Auth/Auth.interface';
import { JwtService } from '../Auth/Jwt/Jwt.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(PendingUser)
    private pendingUserRepository: Repository<PendingUser>
  ) {}

  /**
   * Function to register a new user
   *
   * @param settings settings of  type IPendingUser
   *
   * @returns Promise<void>
   */

  async handleRegister(settings: RegisterUser): Promise<void> {
    let user: PendingUser = new PendingUser();
    const hashed: string = await JwtService.Hash(settings.password);
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
      throw new BadRequestException('Mail And Tag Have To Be Unique');
    }

    await this.pendingUserRepository.save(user);
  }

  /**
   * Function to verify an user
   *
   * @param uuid uuid of PendingUser to be verified
   *
   * @returns Promise<void>
   */

  async handleVerify(uuid: string): Promise<void> {
    const pending: DBResponse<PendingUser> = await this.pendingUserRepository.findOne({
      uuid: uuid,
    });
    if (!pending) throw new NotFoundException('User Not Found');
    let user = new User();
    user = { ...user, ...pending };
    user.online = false;
    user.lastSeen = new Date();
    await this.userRepository.save(user);
    await this.pendingUserRepository.remove(pending);
  }

  /**
   * Functoin to edit an user
   *
   * @param settings data to be changed
   *
   * @param payload payload of the user jwt
   *
   * @returns Promise<void>
   */

  async handleEdit(settings: EditUser, payload: TokenPayload): Promise<void> {
    const user: DBResponse<User> = await this.userRepository.findOne({
      uuid: payload.user,
    });
    if (!user) throw new NotFoundException('User Not Found');
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
        throw new BadRequestException('Tag Has To Be Unique');
      }
    }
    await this.userRepository.update({ uuid: payload.user }, { ...user, ...settings });
  }

  /**
   * Function to delete an user
   *
   * @param payload payload of the user jwt
   *
   * @returns Promise<void>
   */

  async handleDelete(payload: TokenPayload): Promise<void> {
    const user: DBResponse<User> = await this.userRepository.findOne({
      uuid: payload.user,
    });
    if (!user) throw new NotFoundException('User Not Found');
    await this.userRepository.remove(user);
  }

  /**
   * Get a user
   *
   * When no uuid is provided the logged in user is returned
   *
   * @param uuid user uuid
   *
   * @returns Promise<User>
   */

  async handleGet(uuid: string): Promise<User> {
    const user: DBResponse<User> = await this.userRepository
      .createQueryBuilder('user')
      .where('user.uuid = :uuid', {
        uuid: uuid.toLowerCase(),
      })
      .leftJoinAndSelect('user.chats', 'chats')
      .leftJoinAndSelect('chats.chat', 'chat')
      .leftJoinAndSelect('chat.messages', 'message')
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('members.user', 'member_user')
      .getOne();
    if (!user) throw new NotFoundException('User Not Found');
    else return user;
  }

  /**
   * Cron task firing every day at 00:00.00 to delete expired pending users
   *
   * @returns Promise<void>
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
