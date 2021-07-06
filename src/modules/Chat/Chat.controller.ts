import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Response } from 'express';
import { diskStorage } from 'multer';
import path from 'path';
import { config } from '../../config';
import Authorization from '../../decorators/Authorization.decorator';
import Permissions from '../../decorators/Permission.decorator';
import Roles from '../../decorators/Roles.decorator';
import { AdminPermission } from '../../entities/AdminPermission.entity';
import { BannedMember } from '../../entities/BannedMember.entity';
import { Chat } from '../../entities/Chat.entity';
import { ChatAdmin } from '../../entities/ChatAdmin.entity';
import { ChatMember } from '../../entities/ChatMember.entity';
import { MemberLog } from '../../entities/MemberLog.entity';
import { Message } from '../../entities/Message.entity';
import { User } from '../../entities/User.entity';
import AuthGuard from '../../guards/AuthGuard.guard';
import { BanMemberDto } from '../../pipes/validation/BanMemberDto.dto';
import { GroupChatDto } from '../../pipes/validation/GroupChatDto.dto';
import { GroupTagDto } from '../../pipes/validation/GroupTagDto.dto';
import { KickMemberDto } from '../../pipes/validation/KickMemberDto.dto';
import { PrivateChatDto } from '../../pipes/validation/PrivateChatDto.dto';
import { TokenPayload } from '../Auth/Jwt/Jwt.interface';
import { JwtService } from '../Auth/Jwt/Jwt.service';
import { Permission, ChatPreview, GroupRole, ChatType } from './Chat.interface';
import { ChatService } from './Chat.service';

const uploadConfig: MulterOptions = {
  fileFilter: (req: any, file: any, callback: any) => {
    let rejected: boolean = false;
    const contentLength: number = parseInt(req.headers['content-length'] || '');
    if (contentLength > config.avatarSize) {
      callback(new BadRequestException(`Maximum File Size Is ${config.avatarSize} Bytes`), false);
      rejected = true;
    }
    if (!file.originalname.endsWith(config.avatarType)) {
      callback(new BadRequestException('File Has To Be Of Type JPEG'), false);
      rejected = true;
    }
    if (!rejected) callback(null, true);
  },
  storage: diskStorage({
    destination: './data/avatar/group',
    filename: (req, file, callback) => {
      const payload: TokenPayload | undefined = JwtService.DecodeToken(
        req.headers.authorization || ''
      );
      if (!payload) callback(new BadRequestException('Invalid Token'), '');
      //this should never happen because the AuthGuard gets executed before the interceptor but safety first
      else {
        const filename: string = req.params.uuid;
        const extension: string = path.parse(file.originalname).ext;
        callback(null, `${filename}${extension}`);
      }
    },
  }),
  limits: {
    fileSize: config.avatarSize,
  },
};

/**
 * Chat controller to create, modiy, handle and delete chats
 */

@Controller('chat')
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
   * Route to check whether a given tag exists
   *
   * @param body request body
   *
   * @returns Promise<boolean>
   */

  @Post('check/tag')
  async verifyTag(@Body() body: GroupTagDto): Promise<boolean> {
    return await this.chatService.handleTagVerify(body.tag);
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
  @Roles(GroupRole.MEMBER)
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
  @Permissions(Permission.BAN)
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
  @Permissions(Permission.UNBAN)
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
  @Permissions(Permission.KICK)
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
      const chat: Chat | undefined = await this.chatService.getChat(uuid);
      if (!chat) throw new NotFoundException('Chat Not Found');
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
  @Roles(GroupRole.MEMBER)
  async getMessages(
    @Authorization() payload: TokenPayload,
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Param('timestamp', new ParseIntPipe()) timestamp: number,
    @Param('amount', new ParseIntPipe()) amount: number
  ): Promise<any> {
    try {
      const chat: Chat = await this.chatService.handleGet(uuid);
      const messages: Array<any> = chat.messages
        .filter((message: Message) => message.createdAt.getTime() < timestamp)
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

      const next: Message | undefined = messages.slice(amount, amount + 1)[0];

      const log: Array<MemberLog> = chat.memberLog.filter((log: MemberLog) => {
        const beforeNext: boolean = !next || log.timestamp.getTime() > next.createdAt.getTime();
        return log.timestamp.getTime() < timestamp && beforeNext;
      });

      const last: boolean = messages.length <= amount;
      return {
        messages: last ? messages : messages.slice(0, amount),
        log: log.map((memberLog: MemberLog) => ({
          user: memberLog.userUuid,
          chat: memberLog.chatUuid,
          timestamp: memberLog.timestamp,
          joined: memberLog.joined,
        })),
        last: last,
      };
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to update the last read timestamp of a member
   *
   * @param payload payload of user jwt
   *
   * @param uuid uuid of chat
   *
   * @param timestamp new timestamp
   */

  @Get(':uuid/messages/read/:timestamp')
  @Roles(GroupRole.MEMBER)
  async readMessage(
    @Authorization() payload: TokenPayload,
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Param('timestamp', new ParseIntPipe()) timestamp: number
  ): Promise<any> {
    try {
      await this.chatService.handleMessageRead(uuid, timestamp, payload);
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
  @Roles(GroupRole.MEMBER)
  async get(
    @Authorization() payload: TokenPayload,
    @Param('uuid', new ParseUUIDPipe()) uuid: string
  ): Promise<any> {
    try {
      const chat: Chat = await this.chatService.handleGet(uuid);
      const messages = await this.getMessages(payload, uuid, new Date().getTime(), 25);
      const admins: Array<ChatAdmin> = chat.admins;
      return {
        uuid: chat.uuid,
        type: ChatType[chat.type],
        name: chat.name,
        tag: chat.tag,
        avatar: chat.avatar,
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
        memberLog: messages.log,
      };
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to get the avatar of a group by its uuid
   *
   * @param uuid uuid of the group
   *
   * @param response response of the request
   *
   * @returns Promise<any>
   */

  @Get(':uuid/avatar')
  async getAvatar(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Res() response: Response
  ): Promise<any> {
    try {
      await this.chatService.handleAvatarGet(uuid);
      response.sendFile(`${uuid}${config.avatarType}`, { root: './data/avatar/group' }, (err) => {
        if (err) new NotFoundException('Avatar Not Found');
      });
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to upload a new avatar picture
   *
   * @param file uploaded file
   *
   * @param payload payload of user jwt
   *
   * @param uuid uuid of the group
   *
   * @returns Promise<void>
   */

  @Post(':uuid/avatar/upload')
  @Permissions(Permission.CHAT_EDIT)
  @UseInterceptors(FileInterceptor('avatar', uploadConfig))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Authorization() payload: TokenPayload,
    @Param('uuid', new ParseUUIDPipe()) uuid: string
  ): Promise<void> {
    try {
      await this.chatService.handleAvatarUpload(file, payload, uuid);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to delete an avatar picture
   *
   * @param uuid uuid of the group
   *
   * @param payload
   *
   * @returns Promise<void>
   */

  @Get(':uuid/avatar/delete')
  @Permissions(Permission.CHAT_EDIT)
  async deleteAvatar(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Authorization() payload: TokenPayload
  ): Promise<void> {
    try {
      await this.chatService.handleAvatarDelete(payload, uuid);
    } catch (exception) {
      throw exception;
    }
  }
}
