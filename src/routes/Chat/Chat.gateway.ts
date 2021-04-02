import { HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { AdminPermission } from '../../entities/AdminPermission.entity';
import { Chat } from '../../entities/Chat.entity';
import { ChatAdmin } from '../../entities/ChatAdmin.entity';
import { ChatMember } from '../../entities/ChatMember.entity';
import { Message } from '../../entities/Message.entity';
import { User } from '../../entities/User.entity';
import { DBResponse, HandleService } from '../../util/Types.type';
import { TokenPayload } from '../Auth/Auth.interface';
import { AuthService } from '../Auth/Auth.service';
import {
  ChatEvent,
  ChatSocket,
  IAdminPermission,
  IChatEdit,
  IChatRole,
  IChatType,
  IMemberEdit,
  IMessageEdit,
} from './Chat.interface';

@WebSocketGateway()
export class ChatGateway {
  constructor(
    @InjectRepository(Chat) private chatRepository: Repository<Chat>,
    @InjectRepository(ChatMember) private chatMemberRepository: Repository<ChatMember>,
    @InjectRepository(ChatAdmin) private chatAdminRepository: Repository<ChatAdmin>,
    @InjectRepository(Message) private messageRepository: Repository<Message>,
    @InjectRepository(AdminPermission)
    private adminPermissionRepository: Repository<AdminPermission>,
    private authService: AuthService
  ) {}

  @WebSocketServer() server: Server;

  /**
   * @param message
   *
   * @param client
   *
   * @description
   *
   * @returns Promise<void>
   *
   * @introduced 20.02.2021
   *
   * @edited 14.03.2021
   */

  @SubscribeMessage(ChatEvent.MESSAGE)
  async handleMessage(
    @MessageBody() body: ChatSocket<string>,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const token: string = client.handshake.headers['authorization']?.substr(7);
    if (!Boolean(token)) return client.error('No Token Provided');
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return client.error(payload.message);
    if (!body || !body.chat || !body.data) return client.error('Missing Arguments');
    const chat: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: body.chat })
      .leftJoinAndSelect('chat.members', 'member')
      .getOne();
    if (!chat) return client.error('Chat Not Found');
    const member: DBResponse<ChatMember> = chat.members.find((member: ChatMember) => {
      return member.userUuid == payload.user;
    });
    if (!member) return client.error('User Not Found In Chat');

    const message: Message = new Message();
    message.chatUuid = chat.uuid;
    message.userUuid = member.userUuid;
    message.text = body.data;

    await this.messageRepository.save(message);

    this.server.to(body.chat).emit(ChatEvent.MESSAGE, {
      uuid: message.uuid,
      chat: message.chatUuid,
      sender: message.userUuid,
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      pinned: message.pinned,
      text: message.text,
    });
  }

  /**
   * @param body
   *
   * @param client websocket instance
   *
   * @description
   *
   * @returns Promise<void>
   *
   * @introduced 21.02.2021
   *
   * @edited 14.03.2021
   */

  @SubscribeMessage(ChatEvent.CHAT_EDIT)
  async handleChatEdit(
    @MessageBody() body: ChatSocket<IChatEdit>,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const token: string = client.handshake.headers['authorization']?.substr(7);
    if (!Boolean(token)) return client.error('No Token Provided');
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return client.error(payload.message);
    if (!body || !body.chat || !body.data) return client.error('Missing Arguments');
    const changes: IChatEdit = body.data;
    const settings: IChatEdit = {
      type: changes.type ? (changes.type in IChatType ? changes.type : undefined) : undefined,
      tag: changes.tag,
      name: changes.name,
      description: changes.description,
    };
    for (const key in settings) {
      settings[key as keyof IChatEdit] == null && delete settings[key as keyof IChatEdit];
    }
    const chat: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: body.chat })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('chat.admins', 'admins')
      .leftJoinAndSelect('admins.permissions', 'permissions')
      .getOne();
    if (!chat) return client.error('Chat Not Found');
    if (chat.type == IChatType.PRIVATE) return client.error('Chat Has To Be Group');

    const existing: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder()
      .where('LOWER(tag) = LOWER(:tag)', { tag: settings.tag })
      .getOne();
    if (existing) return client.error('Group Tag Has To Be Unique');

    const user: DBResponse<ChatMember> = chat.members.find((member: ChatMember) => {
      return member.userUuid == payload.user;
    });
    if (!user) return client.error('User Not Found');
    if (user.role == IChatRole.MEMBER) return client.error('Lacking Permissions');
    if (user.role == IChatRole.ADMIN) {
      const admin: DBResponse<ChatAdmin> = chat.admins.find((admin: ChatAdmin) => {
        return admin.userUuid == user.userUuid;
      });
      if (!admin) return client.error('Admin Not Found');
      if (!admin.permissions.find((p: AdminPermission) => p.permission == IAdminPermission.EDIT)) {
        return client.error('Lacking Permissions');
      }
    }

    await this.chatRepository.save({
      ...chat,
      tag: settings.tag || chat.tag,
      name: settings.name || chat.name,
      description: settings.description || chat.description,
      type: (settings.type && IChatType[settings.type]) || chat.type,
    });

    this.server.to(body.chat).emit(ChatEvent.CHAT_EDIT, {
      chat: body.chat,
      tag: settings.tag || chat.tag,
      name: settings.name || chat.name,
      description: settings.description || chat.description,
      type: (settings.type && IChatType[settings.type]) || chat.type,
    });
  }

  /**
   * @param body
   *
   * @param client websocket instance
   *
   * @description
   *
   * @returns Promise<void>
   *
   * @introduced 21.02.2021
   *
   * @edited 14.03.2021
   */

  @SubscribeMessage(ChatEvent.MESSAGE_EDIT)
  async handleMessageEdit(
    @MessageBody() body: IMessageEdit,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const token: string = client.handshake.headers['authorization']?.substr(7);
    if (!Boolean(token)) return client.error('No Token Provided');
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return client.error(payload.message);
    if (!body) return client.error('Missing Arguments');
    const settings: IMessageEdit = {
      message: body.message,
      pinned: body.pinned,
      text: body.text,
    };
    for (const key in settings) {
      settings[key as keyof IMessageEdit] == null && delete settings[key as keyof IMessageEdit];
    }
    if (!settings.message) return client.error('Missing Arguments');

    const message: DBResponse<Message> = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.uuid = :uuid', { uuid: settings.message })
      .leftJoinAndSelect('message.chat', 'chat')
      .leftJoinAndSelect('chat.members', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .getOne();
    if (!message) return client.error('Message Not Found');

    const user: DBResponse<ChatMember> = message.chat.members.find((member: ChatMember) => {
      return member.userUuid == payload.user;
    });
    if (!user) return client.error('User Not Found');
    if (user.userUuid != message.userUuid) return client.error('Only Creator Can Edit Message');

    const editedMessage: Message = {
      ...message,
      text: settings.text || message.text,
      pinned: settings.pinned != null ? settings.pinned : message.pinned,
      edited: message.edited + (settings.text && settings.text != message.text ? 1 : 0),
      editedAt: settings.text && settings.text != message.text ? new Date() : message.editedAt,
    };

    await this.messageRepository.save(editedMessage);

    this.server.to(editedMessage.chatUuid).emit(ChatEvent.MESSAGE_EDIT, {
      chat: editedMessage.chatUuid,
      message: editedMessage.uuid,
      text: editedMessage.text,
      pinned: editedMessage.pinned,
      edited: editedMessage.edited,
      editedAt: editedMessage.editedAt,
    });
  }

  /**
   * @param body
   *
   * @param client websocket instance
   *
   * @description
   *
   * @returns Promise<void>
   *
   * @introduced 21.02.2021
   *
   * @edited 14.03.2021
   */

  @SubscribeMessage(ChatEvent.MEMBER_EDIT)
  async handleMemberEdit(
    @MessageBody() body: ChatSocket<IMemberEdit>,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const token: string = client.handshake.headers['authorization']?.substr(7);
    if (!Boolean(token)) return client.error('No Token Provided');
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return client.error(payload.message);
    if (!body || !body.chat || !body.data) return client.error('Missing Arguments');
    const changes: IMemberEdit = body.data;
    const settings: IMemberEdit = {
      user: changes.user,
      role: changes.role in IChatRole && (IChatRole[changes.role] as any),
      permissions: (Array.isArray(changes.permissions) && changes.permissions) || [],
    };
    for (const key in settings) {
      if (settings[key as keyof IMemberEdit] == null) return client.error('Missing Arguments');
    }

    const chat: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: body.chat })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .leftJoinAndSelect('chat.banned', 'banned')
      .leftJoinAndSelect('chat.admins', 'admins')
      .leftJoinAndSelect('admins.permissions', 'permissions')
      .getOne();

    if (!chat) return client.error('Chat Not Found');
    if (chat.type == IChatType.PRIVATE) return client.error('Chat Has To Be Group');

    const user: DBResponse<ChatMember> = chat.members.find((member: ChatMember) => {
      return member.userUuid == payload.user;
    });
    if (!user) return client.error('User Not Found');
    if (user.role == IChatRole.MEMBER) {
      return client.error('Lacking Permissions');
    }

    const member: DBResponse<ChatMember> = chat.members.find((member: ChatMember) => {
      return member.userUuid == settings.user;
    });
    if (!member) return client.error('User Not Found');
    if (member.role == IChatRole.OWNER) return client.error("Owner Can't Be Edited");

    if (user.role === IChatRole.ADMIN) {
      const admin: DBResponse<ChatAdmin> = chat.admins.find((admin: ChatAdmin) => {
        return admin.userUuid == payload.user;
      });
      if (!admin) return client.error('Admin Not Found');
      const canEdit: DBResponse<any> = admin.permissions.find((permission: AdminPermission) => {
        return permission.permission == IAdminPermission.USERS;
      });
      if (!canEdit) return client.error('Lacking Permissions');
      if (settings.role == IChatRole.OWNER) {
        return client.error("Admin Can't Change Owner");
      }
    }

    if (settings.role === IChatRole.OWNER) {
      await this.chatMemberRepository.save({ ...user, role: IChatRole.MEMBER });
      await this.chatMemberRepository.save({ ...member, role: IChatRole.OWNER });
      this.server.to(chat.uuid).emit(ChatEvent.MEMBER_EDIT, {
        chat: chat.uuid,
        user: user.userUuid,
        role: IChatRole[IChatRole.MEMBER],
        permissions: [],
      });
      this.server.to(chat.uuid).emit(ChatEvent.MEMBER_EDIT, {
        chat: chat.uuid,
        user: member.userUuid,
        role: IChatRole[IChatRole.OWNER],
        permissions: [],
      });
    }

    if (settings.role === IChatRole.ADMIN) {
      if (member.role === IChatRole.ADMIN) {
        const admin: DBResponse<ChatAdmin> = chat.admins.find((admin: ChatAdmin) => {
          return admin.userUuid == settings.user;
        });
        if (!admin) {
          await this.chatMemberRepository.save({ ...member, role: IChatRole.MEMBER });
          return client.error('Admin Not Found');
        }
        await this.chatAdminRepository.save({
          ...admin,
          permissions: await Promise.all(
            settings.permissions.map(async (perm: IAdminPermission) => {
              const permission: AdminPermission = new AdminPermission();
              permission.permission = IAdminPermission[perm] as any;
              await this.adminPermissionRepository.save(permission);
              return permission;
            })
          ),
        });
      } else {
        const admin: ChatAdmin = new ChatAdmin();
        admin.chat = chat;
        admin.user = member.user;
        admin.permissions = [
          ...settings.permissions.map((perm: IAdminPermission) => {
            const permission: AdminPermission = new AdminPermission();
            permission.permission = perm;
            return permission;
          }),
        ];
        await this.chatMemberRepository.save({ ...member, role: IChatRole.ADMIN });
        await this.chatAdminRepository.save(admin);
      }
      this.server.to(chat.uuid).emit(ChatEvent.MEMBER_EDIT, {
        chat: chat.uuid,
        user: member.userUuid,
        role: IChatRole[IChatRole.ADMIN],
        permissions: [settings.permissions],
      });
    }

    if (settings.role === IChatRole.MEMBER) {
      if (member.role === IChatRole.MEMBER) return;
      const admin: DBResponse<ChatAdmin> = chat.admins.find((admin: ChatAdmin) => {
        return admin.userUuid == settings.user;
      });
      if (!admin) return client.error('Admin Not Found');
      await this.chatAdminRepository.remove(admin);
      await this.chatMemberRepository.save({ ...member, role: IChatRole.MEMBER });
      this.server.to(chat.uuid).emit(ChatEvent.MEMBER_EDIT, {
        chat: chat.uuid,
        user: member.userUuid,
        role: IChatRole[IChatRole.MEMBER],
        permissions: [],
      });
    }
  }

  /**
   * @param chatUuid uuid of Chat
   *
   * @description handler to emit websockets to online chatmembers for deleting the chat on runtime
   *
   * @returns Promise<void>
   *
   * @introduced 21.02.2021
   *
   * @edited 14.03.2021
   */

  async handleChatDelete(chatUuid: string): Promise<void> {
    this.server.to(chatUuid).emit(ChatEvent.CHAT_DELETE, { chat: chatUuid });
  }

  /**
   * @param chatUuid uuid of Chat
   *
   * @param userUuid uuid of User
   *
   * @param token user auth token
   *
   * @description handler to emit websockets to online chatmembers to add the new member to the chat on runtime
   *
   * @returns Promise<void>
   *
   * @introduced 21.02.2021
   *
   * @edited 14.03.2021
   */

  async handleGroupUserJoin(chatUuid: string, userUuid: string, token: string): Promise<void> {
    const sockets: { [id: string]: Socket } = this.server.clients().sockets;
    for (let socket in sockets) {
      const client: Socket = sockets[socket];
      const clientToken: string = client.handshake.headers['authorization']?.substr(7);
      if (clientToken == token) client.join(chatUuid);
    }

    const chat: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .getOne();
    if (!chat) return; //maybe error message -> to who (?)
    const member: DBResponse<ChatMember> = chat?.members.find((member: ChatMember) => {
      return member.userUuid == userUuid;
    });
    if (!member) return; //maybe error message -> to who (?)
    const user: User = member.user;

    this.server.to(chatUuid).emit(ChatEvent.MEMBER_JOIN, {
      chat: chatUuid,
      user: {
        uuid: user.uuid,
        joinedAt: member.joinedAt,
        createdAt: user.createdAt,
        role: IChatRole[member.role],
        name: user.name,
        tag: user.tag,
        description: user.description,
        avatar: user.avatar,
        locale: user.locale,
        online: user.online,
      },
    });
  }

  /**
   * @param chatUuid uuid of Chat
   *
   * @param userUuid uuid of User
   *
   * @description handler to emit websockets to online chatmembers to delete the member from the chat on runtime
   *
   * @returns Promise<void>
   *
   * @introduced 21.02.2021
   *
   * @edited 14.03.2021
   */

  async handleGroupUserLeave(chatUuid: string, userUuid: string, token: string): Promise<void> {
    const sockets: { [id: string]: Socket } = this.server.clients().sockets;
    for (let socket in sockets) {
      const client: Socket = sockets[socket];
      const clientToken: string = client.handshake.headers['authorization']?.substr(7);
      if (clientToken == token) client.leave(chatUuid);
    }
    this.server.to(chatUuid).emit(ChatEvent.MEMBER_LEAVE, { chat: chatUuid, user: userUuid });
  }

  /**
   * @param chatUuid uuid of Chat
   *
   * @param userUuid uuid of User
   *
   * @description handler to emit websockets to online chatmembers to delete the banned member from the chat on runtime
   *
   * @returns Promise<void>
   *
   * @introduced 21.02.2021
   *
   * @edited 14.03.2021
   */

  async handleGroupUserBan(chatUuid: string, userUuid: string): Promise<void> {
    const sockets: { [id: string]: Socket } = this.server.clients().sockets;
    for (let socket in sockets) {
      const client: Socket = sockets[socket];
      const token: string = client.handshake.headers['authorization']?.substr(7);
      const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
      if (!payload || payload instanceof HttpException) return; //maybe error message -> to who (?)
      if (payload.user == userUuid) client.leave(chatUuid);
    }
    this.server.to(chatUuid).emit(ChatEvent.MEMBER_BANNED, { chat: chatUuid, user: userUuid });
  }
}
