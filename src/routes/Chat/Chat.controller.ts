import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import Authorization from '../../decorators/Authorization.decorator';
import GroupChat from '../../decorators/GroupChat.decorator';
import Uuid from '../../decorators/Uuid.decorator';
import { AdminPermission } from '../../entities/AdminPermission.entity';
import { BannedMember } from '../../entities/BannedMember.entity';
import { Chat } from '../../entities/Chat.entity';
import { ChatAdmin } from '../../entities/ChatAdmin.entity';
import { ChatMember } from '../../entities/ChatMember.entity';
import { Message } from '../../entities/Message.entity';
import { User } from '../../entities/User.entity';
import AuthGuard from '../../guards/AuthGuard';
import { DBResponse } from '../../util/Types.type';
import { TokenPayload } from '../Auth/Auth.interface';
import {
  IAdminPermission,
  IChat,
  IChatPreview,
  IChatRole,
  IChatType,
  IGroupChat,
} from './Chat.interface';
import { ChatService } from './Chat.service';

/**
 * Chats controller to create, modiy, handle and delete chats
 */

@Controller('chats')
export class ChatController {
  constructor(private chatService: ChatService) {}

  /**
   * Route to create a new PrivateChat
   *
   * @param payload payload of user jwt
   *
   * @param participant uuid of the participant
   *
   * @returns Promise<void>
   */

  @Post('create/private')
  @UseGuards(AuthGuard)
  async createPrivate(
    @Authorization() payload: TokenPayload,
    @Uuid() participant: string
  ): Promise<void> {
    try {
      await this.chatService.handlePrivateCreate(participant, payload);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to create a new GroupChat
   *
   * @param payload payload of user jwt
   *
   * @param chat IGroupChat
   *
   * @returns Promise<void>
   */

  @Post('create/group')
  @UseGuards(AuthGuard)
  async createGroup(
    @Authorization() payload: TokenPayload,
    @GroupChat() chat: IGroupChat
  ): Promise<void> {
    try {
      await this.chatService.handleGroupCreate(chat, payload);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to join a chat
   *
   * @param payload payload of user jwt
   *
   * @param uuid uuid of Chat
   *
   * @returns Promise<void>
   */

  @Get(':uuid/join')
  @UseGuards(AuthGuard)
  async join(
    @Authorization() payload: TokenPayload,
    @Param('uuid', new ParseUUIDPipe()) uuid: string
  ): Promise<void> {
    try {
      await this.chatService.handleJoin(uuid, payload);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to leave a chat
   *
   * @param payload payload of user jwt
   *
   * @param uuid uuid of Chat
   *
   * @returns Promise<void>
   */

  @Get(':uuid/leave')
  @UseGuards(AuthGuard)
  async leave(
    @Authorization() payload: TokenPayload,
    @Param('uuid', new ParseUUIDPipe()) uuid: string
  ): Promise<void> {
    try {
      await this.chatService.handleLeave(uuid, payload);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to delete a chat
   *
   * @param payload payload of user jwt
   *
   * @param uuid uuid of Chat
   *
   * @returns Promise<void>
   */

  @Get(':uuid/delete')
  @UseGuards(AuthGuard)
  async delete(
    @Authorization() payload: TokenPayload,
    @Param('uuid', new ParseUUIDPipe()) uuid: string
  ): Promise<void> {
    try {
      await this.chatService.handleDelete(uuid, payload);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to ban an user from a group
   *
   * @param payload payload of user jwt
   *
   * @param uuid uuid of Chat
   *
   * @param user uuid of User to be banned
   *
   * @returns Promise<void>
   */

  @Post(':uuid/admin/ban')
  @UseGuards(AuthGuard)
  async ban(
    @Authorization() payload: TokenPayload,
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Uuid() user: string
  ): Promise<void> {
    try {
      await this.chatService.handleBan(uuid, user, payload);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to unban an user from a group
   *
   * @param payload payload of user jwt
   *
   * @param uuid uuid of Chat
   *
   * @param user uuid of User to be unbanned
   *
   * @returns Promise<void>
   */

  @Post(':uuid/admin/unban')
  @UseGuards(AuthGuard)
  async unban(
    @Authorization() payload: TokenPayload,
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Uuid() user: string
  ): Promise<void> {
    try {
      await this.chatService.handleUnban(uuid, user, payload);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to kick an user from a group
   *
   * @param payload payload of user jwt
   *
   * @param uuid uuid of Chat
   *
   * @param user uuid of User
   *
   * @returns Promise<void>
   */

  @Post(':uuid/admin/kick')
  @UseGuards(AuthGuard)
  async kick(
    @Authorization() payload: TokenPayload,
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Uuid() user: string
  ): Promise<void> {
    try {
      await this.chatService.handleKick(uuid, user, payload);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Get a preview of the chat without being logged in
   *
   * @param request request instance
   *
   * @param uuid uuid of Chat
   *
   * @returns Promise<any>
   */

  @Get('get/:uuid/preview')
  async getPreview(@Param('uuid', new ParseUUIDPipe()) uuid: string): Promise<IChatPreview> {
    try {
      const chat: Chat = await this.chatService.handleGet(uuid);
      if (chat instanceof HttpException) throw chat;
      return {
        uuid: chat.uuid,
        type: chat.type,
        description: chat.description,
        name: chat.name,
        tag: chat.tag,
        size: chat.members.length,
        online: chat.members.filter(({ user: { online } }) => online).length,
      };
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to get a specific chat
   *
   * @param payload payload of user jwt
   *
   * @param uuid uuid of Chat
   *
   * @returns Promise<IChat>
   */
  @Get('get/:uuid')
  @UseGuards(AuthGuard)
  async get(
    @Authorization() payload: TokenPayload,
    @Param('uuid', new ParseUUIDPipe()) uuid: string
  ): Promise<IChat> {
    try {
      const chat: Chat = await this.chatService.handleGet(uuid);
      if (chat.type == IChatType.PRIVATE) {
        const member: DBResponse<ChatMember> = chat.members.find((member: ChatMember) => {
          member.userUuid == payload.user;
        });
        if (!member) throw new BadRequestException('User Has To Be Member Of Private Chat');
      }

      const admins: Array<ChatAdmin> = chat.admins;
      return {
        uuid: chat.uuid,
        type: IChatType[chat.type],
        name: chat.name,
        tag: chat.tag,
        description: chat.description,
        members: chat.members.map((member: ChatMember) => {
          const user: User = member.user;
          const chatAdmin: DBResponse<ChatAdmin> = admins?.find((admin: ChatAdmin) => {
            return admin.userUuid == user.uuid;
          });
          const admin: any = chatAdmin && {
            promotedAt: chatAdmin.promotedAt,
            permissions: chatAdmin.permissions.map((perm: AdminPermission) => {
              return IAdminPermission[perm.permission];
            }),
          };

          return {
            joinedAt: member.joinedAt,
            user: {
              uuid: user.uuid,
              createdAt: user.createdAt,
              role: IChatRole[member.role],
              name: user.name,
              tag: user.tag,
              description: user.description,
              avatar: user.avatar,
              locale: user.locale,
            },
            ...{ admin },
          };
        }),
        messages: chat.messages.map((message: Message) => {
          return {
            uuid: message.uuid,
            sender: message.userUuid,
            chat: message.chatUuid,
            createdAt: message.createdAt,
            editedAt: message.editedAt,
            edited: message.edited,
            pinned: message.pinned,
            text: message.text,
          };
        }),
        banned: chat.banned.map((member: BannedMember) => {
          const user: User = member.user;
          return {
            bannedAt: member.bannedAt,
            user: {
              uuid: user.uuid,
              createdAt: user.createdAt,
              name: user.name,
              tag: user.tag,
              description: user.description,
              avatar: user.avatar,
              locale: user.locale,
            },
          };
        }),
      };
    } catch (exception) {
      throw exception;
    }
  }
}
