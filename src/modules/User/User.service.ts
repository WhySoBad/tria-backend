import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { unlinkSync } from 'fs';
import { access } from 'fs/promises';
import { Repository } from 'typeorm';
import { v4 } from 'uuid';
import { config } from '../../config';
import { ChatMember } from '../../entities/ChatMember.entity';
import { PendingUser } from '../../entities/PendingUser.entity';
import { User } from '../../entities/User.entity';
import { EditUserDto } from '../../pipes/validation/EditUserDto.dto';
import { PasswordChangeDto } from '../../pipes/validation/PasswordChangeDto.dto';
import { PasswordResetConfirmDto } from '../../pipes/validation/PasswordResetConfirmDto.dto';
import { PasswordResetDto } from '../../pipes/validation/PasswordResetDto.dto';
import { PasswordResetValidateDto } from '../../pipes/validation/PasswordResetValidateDto.dto';
import { RegisterUserDto } from '../../pipes/validation/RegisterUserDto.dto';
import { RegisterValidateDto } from '../../pipes/validation/RegisterValidateDto.dto';
import { RegisterVerifyDto } from '../../pipes/validation/RegisterVerifyDto.dto';
import { TokenPayload, TokenType } from '../Auth/Jwt/Jwt.interface';
import { JwtService } from '../Auth/Jwt/Jwt.service';
import { ChatType } from '../Chat/Chat.interface';
import { ChatService } from '../Chat/Chat.service';
import { UserGateway } from './User.gateway';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(PendingUser)
    private pendingUserRepository: Repository<PendingUser>,
    private mailerService: MailerService,
    private userGateway: UserGateway,
    private chatService: ChatService
  ) {}

  /**
   * Function to register a new user
   *
   * @param settings settings of  type IPendingUser
   *
   * @returns Promise<void>
   */

  async handleRegister(settings: RegisterUserDto): Promise<void> {
    let user: PendingUser = new PendingUser();
    const hashed: string = await JwtService.Hash(settings.password);

    user.mail = settings.mail.replace(' ', '').toLowerCase();
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

    await this.pendingUserRepository.save(user);

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
      template: 'registration',
      text: `Thanks for registrating a new account. Paste the following url into your browser to finish the registration \n${config.website}/register/${token} \nIf you haven't registered any account you can ignore this email \nthe data will be deleted after seven days`,
      context: {
        href: `${config.website}/register/${token}`,
      },
    });
  }

  /**
   * Function to validate a registration token
   *
   * @param data body containing the token
   *
   * @returns Promise<boolean>
   */

  async handleValidate(data: RegisterValidateDto): Promise<boolean> {
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

  async handleVerify(data: RegisterVerifyDto): Promise<void> {
    const payload: TokenPayload | undefined = JwtService.DecodeToken(
      data.token,
      TokenType.REGISTER
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
    user.name = data.name;
    user.description = data.description;
    user.tag = data.tag;
    user.locale = data.locale;
    user.mail = pending.mail;
    user.password = pending.password;
    user.createdAt = pending.createdAt;
    user.avatar = user.uuid;
    user.online = false;
    user.lastSeen = new Date();

    await this.pendingUserRepository.remove(pending);
    await this.userRepository.save(user);
  }

  /**
   * Function to check whether a given tag exists
   *
   * @param tag tag to be checked
   *
   * @returns Promise<boolean>
   */

  async handleTagVerify(tag: string): Promise<boolean> {
    return !!(await this.userRepository
      .createQueryBuilder()
      .where('LOWER(tag) = LOWER(:tag)', { tag: tag })
      .getOne());
  }

  /**
   * Function to check whether a given mail address exists
   *
   * @param mail mail address to be checked
   *
   * @returns Promise<boolean>
   */

  async handleMailVerify(mail: string): Promise<boolean> {
    return !!(await this.userRepository
      .createQueryBuilder()
      .where('LOWER(mail) = LOWER(:mail)', { mail: mail })
      .getOne());
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

  async handleEdit(data: EditUserDto, payload: TokenPayload): Promise<void> {
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
    await this.userGateway.handleUserEdit(user);
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

  async handlePasswordChange(data: PasswordChangeDto, payload: TokenPayload): Promise<void> {
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

  async handlePasswordReset(data: PasswordResetDto): Promise<void> {
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
        text: `You've successfully resetted your password! Paste the following url into your browser to set a new password \n${config.website}/register/${token} \nIf you haven't requested the password reset you can ignore this email \nthe data will be deleted after five days`,
        template: 'passwordreset',
        context: {
          href: `${config.website}/passwordreset/${token}`,
        },
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

  async handlePasswordResetValidate(data: PasswordResetValidateDto): Promise<boolean> {
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

  async handlePasswordResetConfirm(data: PasswordResetConfirmDto): Promise<void> {
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
    await this.userGateway.handleUserDelete(user);
    user.chats.forEach(async (member: ChatMember) => {
      if (member.chat.type === ChatType.PRIVATE) await this.chatService.deleteChat(member.chat);
      else await this.chatService.leaveChat(member.chat, member);
    });
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
   * Function to validify that an avatar exists
   *
   * @param uuid uuid of the avatar
   *
   * @returns Promise<void>
   */

  async handleAvatarGet(uuid: string): Promise<void> {
    await access(`./data/avatar/user/${uuid}${config.avatarType}`).catch(() => {
      throw new NotFoundException('Avatar Not Found');
    });
  }

  /**
   * Function to handle an avatar upload
   *
   * @param file uploaded file
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<void>
   */

  async handleAvatarUpload(file: Express.Multer.File, payload: TokenPayload): Promise<void> {
    if (!file) throw new BadRequestException('Invalid File');
    const user: User | undefined = await this.userRepository.findOne({ uuid: payload.user });
    if (!user) throw new NotFoundException('User Not Found');
    user.avatar = user.uuid;
    await this.userRepository.save(user);
    await this.userGateway.handleUserEdit(user);
  }

  /**
   * Function to handle an avatar deletion
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<void>
   */

  async handleAvatarDelete(payload: TokenPayload): Promise<void> {
    try {
      const user: User | undefined = await this.userRepository.findOne({ uuid: payload.user });
      if (!user) throw new NotFoundException('User Not Found');
      unlinkSync(`./data/avatar/user/${payload.user}${config.avatarType}`);
      user.avatar = null;
      await this.userRepository.save(user);
      await this.userGateway.handleUserEdit(user);
    } catch (exception) {
      throw new NotFoundException('Avatar Not Found');
    }
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
      if (new Date(user.expires) < new Date()) await this.pendingUserRepository.remove(user);
    });
  }
}
