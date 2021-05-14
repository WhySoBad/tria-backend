import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import Authorization from '../../decorators/Authorization.decorator';
import { AdminPermission } from '../../entities/AdminPermission.entity';
import { BannedMember } from '../../entities/BannedMember.entity';
import { Chat } from '../../entities/Chat.entity';
import { ChatAdmin } from '../../entities/ChatAdmin.entity';
import { ChatMember } from '../../entities/ChatMember.entity';
import { MemberLog } from '../../entities/MemberLog.entity';
import { Message } from '../../entities/Message.entity';
import { User } from '../../entities/User.entity';
import AuthGuard from '../../guards/AuthGuard';
import { BanMemberDto } from '../../pipes/validation/BanMemberDto.dto';
import { GroupChatDto } from '../../pipes/validation/GroupChatDto.dto';
import { KickMemberDto } from '../../pipes/validation/KickMemberDto.dto';
import { PrivateChatDto } from '../../pipes/validation/PrivateChatDto.dto';
import { TokenPayload } from '../Auth/Jwt/Jwt.interface';
import { Permission, ChatPreview, GroupRole, ChatType } from './Chat.interface';
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
   * @param body uuid of the participant
   *
   * @returns Promise<void>
   */

  @Post('create/private')
  @UseGuards(AuthGuard)
  async createPrivate(
    @Authorization() payload: TokenPayload,
    @Body() body: PrivateChatDto
  ): Promise<void> {
    try {
      await this.chatService.handlePrivateCreate(body.user, payload);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to create a new GroupChat
   *
   * @param payload payload of user jwt
   *
   * @param body request body
   *
   * @returns Promise<void>
   */

  @Post('create/group')
  @UseGuards(AuthGuard)
  async createGroup(
    @Authorization() payload: TokenPayload,
    @Body() body: GroupChatDto
  ): Promise<void> {
    try {
      await this.chatService.handleGroupCreate(body, payload);
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
   * @param body uuid of User to be banned
   *
   * @returns Promise<void>
   */

  @Post(':uuid/admin/ban')
  @UseGuards(AuthGuard)
  async ban(
    @Authorization() payload: TokenPayload,
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() body: BanMemberDto
  ): Promise<void> {
    try {
      await this.chatService.handleBan(uuid, body.uuid, payload);
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
   * @param body uuid of User to be unbanned
   *
   * @returns Promise<void>
   */

  @Post(':uuid/admin/unban')
  @UseGuards(AuthGuard)
  async unban(
    @Authorization() payload: TokenPayload,
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() body: BanMemberDto
  ): Promise<void> {
    try {
      await this.chatService.handleUnban(uuid, body.uuid, payload);
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
   * @param body uuid of User
   *
   * @returns Promise<void>
   */

  @Post(':uuid/admin/kick')
  @UseGuards(AuthGuard)
  async kick(
    @Authorization() payload: TokenPayload,
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() body: KickMemberDto
  ): Promise<void> {
    try {
      await this.chatService.handleKick(uuid, body.uuid, payload);
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

  @Get(':uuid/preview')
  async getPreview(@Param('uuid', new ParseUUIDPipe()) uuid: string): Promise<ChatPreview> {
    try {
      const chat: Chat = await this.chatService.handleGet(uuid);
      if (chat.type === ChatType.PRIVATE_GROUP) {
        throw new BadRequestException("Can't Get Preview Of Private Group");
      }
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
   * Route to get a specific amount of messages before a certain timestamp
   *
   * @param payload payload of user jwt
   *
   * @param uuid uuid of Chat
   *
   * @param timestamp timestamp
   *
   * @param amount amount of messages
   *
   * @returns Promise<any>
   */

  @Get(':uuid/messages/:timestamp/:amount')
  @UseGuards(AuthGuard)
  async getMessages(
    @Authorization() payload: TokenPayload,
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Param('timestamp', new ParseIntPipe()) timestamp: number,
    @Param('amount', new ParseIntPipe()) amount: number
  ): Promise<any> {
    try {
      const chat: Chat = await this.chatService.handleGet(uuid);
      if (!chat.members.map(({ userUuid }) => userUuid).includes(payload.user)) {
        throw new BadRequestException('User Has To Be Member Of Chat');
      }
      const messages: Array<any> = chat.messages
        .filter((message: Message) => {
          return message.createdAt.getTime() < timestamp;
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((message: Message) => {
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
        });

      const last: boolean = messages.length <= amount;
      return {
        messages: last ? messages : messages.slice(0, amount),
        last: last,
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
   * @returns Promise<any>
   */
  @Get(':uuid')
  @UseGuards(AuthGuard)
  async get(
    @Authorization() payload: TokenPayload,
    @Param('uuid', new ParseUUIDPipe()) uuid: string
  ): Promise<any> {
    try {
      const chat: Chat = await this.chatService.handleGet(uuid);
      if (!chat.members.map(({ userUuid }) => userUuid).includes(payload.user)) {
        throw new BadRequestException('User Has To Be Member Of Chat');
      }

      const messages = await this.getMessages(payload, uuid, new Date().getTime(), 25);

      const admins: Array<ChatAdmin> = chat.admins;
      return {
        uuid: chat.uuid,
        type: ChatType[chat.type],
        name: chat.name,
        tag: chat.tag,
        description: chat.description,
        createdAt: chat.createdAt,
        members: chat.members.map((member: ChatMember) => {
          const user: User = member.user;
          const chatAdmin: ChatAdmin | undefined = admins?.find((admin: ChatAdmin) => {
            return admin.userUuid == user.uuid;
          });
          const admin: any = chatAdmin && {
            promotedAt: chatAdmin.promotedAt,
            permissions: chatAdmin.permissions.map((perm: AdminPermission) => {
              return Permission[perm.permission];
            }),
          };
          return {
            joinedAt: member.joinedAt,
            role: GroupRole[member.role],
            user: {
              uuid: user.uuid,
              createdAt: user.createdAt,
              lastSeen: user.lastSeen,
              name: user.name,
              tag: user.tag,
              description: user.description,
              avatar: user.avatar,
              locale: user.locale,
              online: user.online,
            },
            ...{ admin },
          };
        }),
        messages: messages.messages,
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
            },
          };
        }),
        memberLog: chat.memberLog.map((memberLog: MemberLog) => {
          return {
            user: memberLog.userUuid,
            chat: memberLog.chatUuid,
            timestamp: memberLog.timestamp,
            joined: memberLog.joined,
          };
        }),
      };
    } catch (exception) {
      throw exception;
    }
  }
}
