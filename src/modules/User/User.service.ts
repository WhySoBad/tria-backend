import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 } from 'uuid';
import { config } from '../../config';
import { PendingUser } from '../../entities/PendingUser.entity';
import { User } from '../../entities/User.entity';
import { EditUser } from '../../pipes/validation/EditUser.pipe';
import { RegisterUserBody } from '../../pipes/validation/RegisterUserBody.pipe';
import { UserPasswordChange } from '../../pipes/validation/UserPasswordChange.pipe';
import { UserPasswordReset } from '../../pipes/validation/UserPasswordReset.pipe';
import { UserPasswordResetConfirm } from '../../pipes/validation/UserPasswordResetConfirm.pipe';
import { UserPasswordResetValidate } from '../../pipes/validation/UserPasswordResetValidate.pipe';
import { UserVerifyBody } from '../../pipes/validation/UserVerifyBody.pipe';
import { TokenPayload, TokenType } from '../Auth/Jwt/Jwt.interface';
import { JwtService } from '../Auth/Jwt/Jwt.service';
import { MailerService } from '@nestjs-modules/mailer';
import { UserRegisterValidateBody } from '../../pipes/validation/UserRegisterValidateBody.pipe';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(PendingUser)
    private pendingUserRepository: Repository<PendingUser>,
    private readonly mailerService: MailerService
  ) {}

  /**
   * Function to register a new user
   *
   * @param settings settings of  type IPendingUser
   *
   * @returns Promise<void>
   */

  async handleRegister(settings: RegisterUserBody): Promise<void> {
    let user: PendingUser = new PendingUser();
    const hashed: string = await JwtService.Hash(settings.password);

    user.mail = settings.mail.replace(' ', '');
    user.password = hashed;

    const pendingExists: boolean = !!(await this.pendingUserRepository
      .createQueryBuilder()
      .where('LOWER(mail) = LOWER(:mail)', { mail: user.mail })
      .getOne());

    const userExists: boolean = !!(await this.userRepository
      .createQueryBuilder()
      .where('LOWER(mail) = LOWER(:mail)', { mail: user.mail })
      .getOne());

    if (pendingExists || userExists) {
      throw new BadRequestException('Mail Has To Be Unique');
    }

    const token: string = JwtService.GenerateToken(
      {
        uuid: v4(),
        user: user.uuid,
        type: TokenType.REGISTER,
      },
      TokenType.REGISTER
    );

    await this.mailerService.sendMail({
      to: user.mail,
      subject: 'Account Registration',
      from: config.noreplyMail,
      text: token,
      html: `<div>${token}</div>`,
    });

    await this.pendingUserRepository.save(user);
  }

  /**
   * Function to validate a registration token
   *
   * @param data body containing the token
   *
   * @returns Promise<boolean>
   */

  async handleValidate(data: UserRegisterValidateBody): Promise<boolean> {
    const payload: TokenPayload | undefined = JwtService.DecodeToken(
      data.token,
      TokenType.REGISTER
    );
    if (!payload) return false;
    else return true;
  }

  /**
   * Function to verify an user
   *
   * @param uuid uuid of PendingUser to be verified
   *
   * @param data data of the user
   *
   * @returns Promise<void>
   */

  async handleVerify(data: UserVerifyBody): Promise<void> {
    const payload: TokenPayload | undefined = JwtService.DecodeToken(
      data.token,
      TokenType.PASSWORD_RESET
    );
    if (!payload) throw new BadRequestException('Invalid Registration Token');

    const pending: PendingUser | undefined = await this.pendingUserRepository.findOne({
      uuid: payload.user,
    });
    if (!pending) throw new NotFoundException('User Not Found');

    const userExists: boolean = !!(await this.userRepository
      .createQueryBuilder()
      .where('LOWER(tag) = LOWER(:tag)', { tag: data.tag })
      .getOne());
    if (userExists) throw new BadRequestException('Tag Has To Be Unique');

    const user: User = new User();
    user.mail = pending.mail;
    user.password = pending.password;
    user.createdAt = pending.createdAt;
    user.online = false;
    user.lastSeen = new Date();

    await this.pendingUserRepository.remove(pending);
    await this.userRepository.save(user);
  }

  /**
   * Functoin to edit an user
   *
   * @param data data to be changed
   *
   * @param payload payload of the user jwt
   *
   * @returns Promise<void>
   */

  async handleEdit(data: EditUser, payload: TokenPayload): Promise<void> {
    const user: User | undefined = await this.userRepository.findOne({ uuid: payload.user });
    if (!user) throw new NotFoundException('User Not Found');

    if (data.tag) {
      const tagPending = await this.pendingUserRepository
        .createQueryBuilder()
        .orWhere('LOWER(tag) = LOWER(:tag)', { tag: user.tag })
        .getOne();

      const tagExists = await this.userRepository
        .createQueryBuilder()
        .orWhere('LOWER(tag) = LOWER(:tag)', { tag: user.tag })
        .getOne();

      if (tagExists || tagPending) {
        throw new BadRequestException('Tag Has To Be Unique');
      }
    }

    if (data.tag) user.tag = data.tag;
    if (data.name) user.name = data.name;
    if (data.description) user.description = data.description;
    if (data.locale) user.locale = data.locale;

    await this.userRepository.save(user);
  }

  /**
   * Function to handle password change
   *
   * @param data data to be changed
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<void>
   */

  async handlePasswordChange(data: UserPasswordChange, payload: TokenPayload): Promise<void> {
    const user: User | undefined = await this.userRepository.findOne({ uuid: payload.user });
    if (!user) throw new NotFoundException('User Not Found');
    const oldHashed: string = await JwtService.Hash(data.old);
    const newHashed: string = await JwtService.Hash(data.new);

    if (oldHashed !== user.password) throw new BadRequestException('Invalid Password');

    user.password = newHashed;
    await this.userRepository.save(user);
  }

  /**
   * Function to send a password reset token to the given mail address
   *
   * @param data data containing mail address
   *
   * @returns Promise<void>
   */

  async handlePasswordReset(data: UserPasswordReset): Promise<void> {
    const user:
      | User
      | undefined = await this.userRepository
      .createQueryBuilder()
      .orWhere('LOWER(mail) = LOWER(:mail)', { mail: data.mail })
      .getOne();

    if (!user) throw new BadRequestException('Mail Not Found');

    const token = JwtService.GenerateToken(
      { uuid: v4(), user: user.uuid, type: TokenType.PASSWORD_RESET },
      TokenType.PASSWORD_RESET
    );

    await this.mailerService
      .sendMail({
        to: data.mail,
        from: config.noreplyMail,
        subject: 'Password Reset',
        text: token,
        html: `<div>${token}</div>`,
      })
      .catch(() => {
        throw new ServiceUnavailableException('Failed To Send Mail');
      });
  }

  /**
   * Function to validate a password reset token
   *
   * @param data body containing the reset token
   *
   * @returns Promise<boolean>
   */

  async handlePasswordResetValidate(data: UserPasswordResetValidate): Promise<boolean> {
    const payload: TokenPayload | undefined = JwtService.DecodeToken(
      data.token,
      TokenType.PASSWORD_RESET
    );
    if (!payload) return false;
    else return true;
  }

  /**
   * Function to change the user password after a reset
   *
   * @param data body containing the reset token and a new password
   *
   * @returns Promise<void>
   */

  async handlePasswordResetConfirm(data: UserPasswordResetConfirm): Promise<void> {
    const payload: TokenPayload | undefined = JwtService.DecodeToken(
      data.token,
      TokenType.PASSWORD_RESET
    );
    if (!payload) throw new BadRequestException('Invalid Reset Token');
    const user: User | undefined = await this.userRepository.findOne({ uuid: payload.user });
    if (!user) throw new NotFoundException('User Not Found');
    user.password = await JwtService.Hash(data.password);
    this.userRepository.save(user);
  }

  /**
   * Function to delete an user
   *
   * @param payload payload of the user jwt
   *
   * @returns Promise<void>
   */

  async handleDelete(payload: TokenPayload): Promise<void> {
    const user: User | undefined = await this.userRepository.findOne({ uuid: payload.user });
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
    const user: User | undefined = await this.userRepository
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
  private async handleCron() {
    const users: Array<PendingUser> = await this.pendingUserRepository.find();
    users.forEach(async (user: PendingUser) => {
      const date: Date = new Date();
      if (user.expires < date) await this.pendingUserRepository.remove(user);
    });
  }
}
