import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
} from '@nestjs/common';
import { AdminPermission } from '../../entities/AdminPermission.entity';
import { BannedMember } from '../../entities/BannedMember.entity';
import { Chat } from '../../entities/Chat.entity';
import { ChatAdmin } from '../../entities/ChatAdmin.entity';
import { ChatMember } from '../../entities/ChatMember.entity';
import { User } from '../../entities/User.entity';
import { DBResponse, HandleService } from '../../util/Types.type';
import {
  IAdminPermission,
  IChat,
  IChatEdit,
  IChatRole,
  IChatType,
  IGroupChat,
  IPrivateChat,
  IUserEdit,
} from './Chat.interface';
import { ChatService } from './Chat.service';

/**
 * @description chats route to create, modiy, handle and delete chats
 * @introduced 18.02.2021
 * @edited 18.02.2021
 */

@Controller('chats')
export class ChatController {
  constructor(private chatService: ChatService) {}

  /**
   * @param request request instance
   * @param chat request body of type IPrivateChat
   * @description route to create a new PrivateChat
   * @returns Promise<void>
   * @introduced 18.02.2021
   * @edited 18.02.2021
   */

  @Post('create/private')
  async createPrivate(@Request() request: Request, @Body() chat: IPrivateChat): Promise<void> {
    const token: string = request.headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    if (!chat) throw new BadRequestException('No Arguments Provided');
    const settings: IPrivateChat = {
      user: chat.user,
    };
    if (!settings.user) throw new BadRequestException('User Has To Be Given');
    const created: HandleService<void> = await this.chatService.handlePrivateCreate(
      settings,
      token.substr(7)
    );
    if (created instanceof HttpException) throw created;
  }

  /**
   * @param request request instance
   * @param chat request body of type IGroupChat
   * @description route to create a new GroupChat
   * @returns Promise<void>
   * @introduced 18.02.2021
   * @edited 18.02.2021
   */

  @Post('create/group')
  async createGroup(@Request() request: Request, @Body() chat: IGroupChat): Promise<void> {
    const token: string = request.headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    if (!chat) throw new BadRequestException('No Arguments Provided');
    const settings: IGroupChat = {
      name: chat.name,
      tag: chat.tag,
      type: chat.type in IChatType ? chat.type : 'PRIVATE_GROUP',
      description: chat.description,
      members: Array.isArray(chat.members) ? chat.members : [],
    };
    for (const key in settings) {
      if (settings[key as keyof IGroupChat] == null) {
        throw new BadRequestException('Missing Arguments');
      }
    }
    const created: HandleService<void> = await this.chatService.handleGroupCreate(
      settings,
      token.substr(7)
    );
    if (created instanceof HttpException) throw created;
  }

  /**
   * @param request request instance
   * @param uuid uuid of Chat
   * @param chat request body of type IChatEdit
   * @description route to edit a chat
   * @returns Promise<void>
   * @introduced 18.02.2021
   * @edited 18.02.2021
   */

  @Post(':uuid/edit')
  async edit(
    @Request() request: Request,
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() chat: IChatEdit
  ): Promise<void> {
    const token: string = request.headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    const settings: IChatEdit = {
      type: chat.type ? (chat.type in IChatType ? chat.type : undefined) : undefined,
      tag: chat.tag,
      name: chat.name,
      description: chat.description,
    };
    for (const key in settings) {
      settings[key as keyof IChatEdit] == null && delete settings[key as keyof IChatEdit];
    }
    const result: HandleService<void> = await this.chatService.handleEdit(
      uuid,
      chat,
      token.substr(7)
    );
    if (result instanceof HttpException) throw result;
  }

  /**
   * @param request request instance
   * @param uuid uuid of Chat
   * @description route to join a chat
   * @returns Promise<void>
   * @introduced 18.02.2021
   * @edited 18.02.2021
   */

  @Get(':uuid/join')
  async join(
    @Request() request: Request,
    @Param('uuid', new ParseUUIDPipe()) uuid: string
  ): Promise<void> {
    const token: string = request.headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    const result: HandleService<void> = await this.chatService.handleJoin(uuid, token.substr(7));
    if (result instanceof HttpException) throw result;
  }

  /**
   * @param request request instance
   * @param uuid uuid of Chat
   * @description route leave a chat
   * @returns Promise<void>
   * @introduced 18.02.2021
   * @edited 18.02.2021
   */

  @Get(':uuid/leave')
  async leave(
    @Request() request: Request,
    @Param('uuid', new ParseUUIDPipe()) uuid: string
  ): Promise<void> {
    const token: string = request.headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    const result: HandleService<void> = await this.chatService.handleLeave(uuid, token.substr(7));
    if (result instanceof HttpException) throw result;
  }

  /**
   * @param request request instance
   * @param uuid uuid of Chat
   * @description route to delete a chat
   * @returns Promise<void>
   * @introduced 18.02.2021
   * @edited 18.02.2021
   */

  @Get(':uuid/delete')
  async delete(
    @Request() request: Request,
    @Param('uuid', new ParseUUIDPipe()) uuid: string
  ): Promise<void> {
    const token: string = request.headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    const result: HandleService<void> = await this.chatService.handleDelete(uuid, token.substr(7));
    if (result instanceof HttpException) throw result;
  }

  /**
   * @param request request instance
   * @param uuid message of Message
   * @param text new content for message
   * @description route to change content of chat messages
   * @returns Promise<void>
   * @introduced 20.02.2021
   * @edited 20.02.2021
   */

  @Get('message/:uuid/edit')
  async messageEdit(
    @Request() request: Request,
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() text: { text: string }
  ): Promise<void> {
    const token: string = request.headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    if (!text.text) throw new BadRequestException('Missing Arguments');
    if (typeof text.text != 'string') throw new BadRequestException('Invalid Arguments');

    const result: HandleService<void> = await this.chatService.handleMessageEdit(
      uuid,
      text.text,
      token.substr(7)
    );
    if (result instanceof HttpException) throw result;
  }

  /**
   * @param request request instance
   * @param uuid uuid of Chat
   * @param user uuid of User to be banned
   * @description route to ban users from a chat
   * @returns Promise<void>
   * @introduced 18.02.2021
   * @edited 19.02.2021
   */

  @Post(':uuid/admin/ban')
  async ban(
    @Request() request: Request,
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() user: { uuid: string }
  ): Promise<void> {
    const token: string = request.headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    const result: HandleService<void> = await this.chatService.handleBan(
      uuid,
      user.uuid,
      token.substr(7)
    );
    if (result instanceof HttpException) throw result;
  }

  /**
   * @param request request instance
   * @param uuid uuid of Chat
   * @param user uuid of User to be unbanned
   * @description route to unban users from a chat
   * @returns Promise<void>
   * @introduced 19.02.2021
   * @edited 19.02.2021
   */

  @Post(':uuid/admin/unban')
  async unban(
    @Request() request: Request,
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() user: { uuid: string }
  ): Promise<void> {
    const token: string = request.headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    const result: HandleService<void> = await this.chatService.handleUnban(
      uuid,
      user.uuid,
      token.substr(7)
    );
    if (result instanceof HttpException) throw result;
  }

  /**
   * @param request request instance
   * @param uuid uuid of Chat
   * @description route to kick users from a chat
   * @returns Promise<void>
   * @introduced 18.02.2021
   * @edited 18.02.2021
   */

  @Post(':uuid/admin/kick')
  async kick(
    @Request() request: Request,
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() user: { uuid: string }
  ): Promise<void> {
    const token: string = request.headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    const result: HandleService<void> = await this.chatService.handleKick(
      uuid,
      user.uuid,
      token.substr(7)
    );
    if (result instanceof HttpException) throw result;
  }

  /**
   * @param request request instance
   * @param uuid uuid of Chat
   * @param user uuid of User to be edited
   * @description route to edit chat members
   * @returns Promise<void>
   * @introduced 18.02.2021
   * @edited 18.02.2021
   */

  @Post(':uuid/admin/edit')
  async editUser(
    @Request() request: Request,
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() user: IUserEdit
  ): Promise<void> {
    const token: string = request.headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    const settings: IUserEdit = {
      user: user.user,
      role: user.role in IChatRole && (IChatRole[user.role] as any),
      permissions: Array.isArray(user.permissions)
        ? user.permissions.filter((permission: IAdminPermission) => {
            return IAdminPermission[permission] != undefined;
          })
        : [],
    };
    for (const key in settings) {
      if (settings[key as keyof IUserEdit] == null) {
        throw new BadRequestException('Missing Arguments');
      }
    }

    const result: HandleService<void> = await this.chatService.handleUserEdit(
      uuid,
      settings,
      token.substr(7)
    );
    if (result instanceof HttpException) throw result;
  }

  /**
   * @param request request instance
   * @param uuid uuid of Chat
   * @description route to get a specifc chat
   * @returns Promise<IChat>
   * @introduced 18.02.2021
   * @edited 19.02.2021
   */

  @Get('get/:uuid')
  async get(
    @Request() request: Request,
    @Param('uuid', new ParseUUIDPipe()) uuid: string
  ): Promise<IChat> {
    const token: string = request.headers['authorization' as keyof Headers]?.toString();
    if (!token) throw new BadRequestException('No Token Provided');
    const chat: HandleService<Chat> = await this.chatService.handleGet(uuid, token.substr(7));
    if (chat instanceof HttpException) throw chat;
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
      messages: chat.messages,
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
  }
}
