import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import Authorization from '../../decorators/Authorization.decorator';
import PendingUser from '../../decorators/PendingUser.decorator';
import UserDecorator from '../../decorators/User.decorator';
import { Chat } from '../../entities/Chat.entity';
import { ChatMember } from '../../entities/ChatMember.entity';
import { Message } from '../../entities/Message.entity';
import { User } from '../../entities/User.entity';
import AuthGuard from '../../guards/AuthGuard';
import { TokenPayload } from '../Auth/Auth.interface';
import { IPendingUser, IUser } from './User.interface';
import { UserService } from './User.service';

/**
 * User route to create, verify, modify and delete users
 */

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Route to register new user
   * @param user request body of type IPendingUser
   *
   * @returns Promise<void>
   */

  @Post('register')
  async register(@PendingUser() user: IPendingUser): Promise<void> {
    try {
      await this.userService.handleRegister(user);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to verify a PendingUser
   *
   * @param uuid uuid of PendingUser
   *
   * @returns Promise<void>
   */

  @Get('verify/:uuid')
  async verify(
    @Param('uuid', new ParseUUIDPipe())
    uuid: string
  ): Promise<void> {
    try {
      await this.userService.handleVerify(uuid);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to edit an user
   *
   * @param user request body of type IUser
   *
   * @param payload payload of the user jwt
   *
   * @returns Promise<void>
   */

  @Post('edit')
  @UseGuards(AuthGuard)
  async edit(@UserDecorator() user: IUser, @Authorization() payload: TokenPayload): Promise<void> {
    try {
      await this.userService.handleEdit(user, payload);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to delete an existing user
   *
   * @param payload payload of the user jwt
   *
   * @returns Promise<void>
   */

  @Get('delete')
  @UseGuards(AuthGuard)
  async delete(@Authorization() payload: TokenPayload): Promise<void> {
    try {
      await this.userService.handleDelete(payload);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to get an user by its uuid
   *
   * @param uuid uuid of User
   *
   * @returns Promise<IUser>
   */

  @Get('get/:uuid')
  @UseGuards(AuthGuard)
  async getByUuid(
    @Param('uuid', new ParseUUIDPipe())
    uuid: string
  ): Promise<IUser> {
    try {
      const user: User = await this.userService.handleGet(uuid);
      const { password, chats, bannedChats, mail, messages, ...rest } = user;
      return rest;
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to get the logged in user
   *
   * @param payload payload of the user jwt
   *
   * @returns Promise<IUser>
   */

  @Get('get')
  @UseGuards(AuthGuard)
  async getLoggedIn(
    @Authorization()
    payload: TokenPayload
  ): Promise<any> {
    try {
      const user: User = await this.userService.handleGet(payload.user);
      return {
        uuid: user.uuid,
        name: user.name,
        tag: user.tag,
        avatar: user.avatar,
        description: user.description,
        mail: user.mail,
        locale: user.locale,
        online: user.online,
        createdAt: user.createdAt,
        lastSeen: user.lastSeen,
        chats: user.chats.map((member: ChatMember) => {
          const chat: Chat = member.chat;
          return {
            ...chat,
            members: chat.members.map((member: ChatMember) => {
              const user: User = member.user;
              return {
                role: member.role,
                joinedAt: member.joinedAt,
                user: {
                  uuid: user.uuid,
                  name: user.name,
                  tag: user.tag,
                  avatar: user.avatar,
                  description: user.description,
                  locale: user.locale,
                  online: user.online,
                  createdAt: user.createdAt,
                  lastSeen: user.lastSeen,
                },
              };
            }),
            messages: chat.messages.map((message: Message) => {
              return {
                uuid: message.uuid,
                chat: message.chatUuid,
                createdAt: message.createdAt,
                editedAt: message.editedAt,
                edited: message.edited,
                text: message.text,
                pinned: message.pinned,
                user: message.userUuid,
              };
            }),
          };
        }),
      };
    } catch (exception) {
      throw exception;
    }
  }
}
