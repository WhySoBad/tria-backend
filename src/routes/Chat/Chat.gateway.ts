import { HttpException, UseFilters, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import WsAuthorization from '../../decorators/WsAuthorization.decorator';
import MessageDecorator from '../../decorators/Message.decorator';
import { AdminPermission } from '../../entities/AdminPermission.entity';
import { Chat } from '../../entities/Chat.entity';
import { ChatAdmin } from '../../entities/ChatAdmin.entity';
import { ChatMember } from '../../entities/ChatMember.entity';
import { Message } from '../../entities/Message.entity';
import { User } from '../../entities/User.entity';
import WsAuthGuard from '../../guards/WsAuthGuard';
import { DBResponse } from '../../util/Types.type';
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
import WsExceptionFilter from '../../filters/WsExceptionFilter.filter';
import ChatEdit from '../../decorators/ChatEdit.decorator';
import MemberEdit from '../../decorators/MemberEdit.decorator';
import MessageEdit from '../../decorators/MessageEdit.decorator';

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
   * Handler for sending new messages
   *
   * @param payload payload of user jwt
   *
   * @param client websocket instance
   *
   * @param body body of the websocket
   *
   * @returns Promise<void>
   */

  @SubscribeMessage(ChatEvent.MESSAGE)
  @UseGuards(WsAuthGuard)
  @UseFilters(WsExceptionFilter)
  async handleMessage(
    @WsAuthorization() payload: TokenPayload,
    @ConnectedSocket() client: Socket,
    @MessageDecorator() body: ChatSocket<string>
  ): Promise<void> {
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
   * Handler for editing a chat
   *
   * @param payload payload of user jwt
   *
   * @param body body of the websocket
   *
   * @param client websocket instance
   *
   * @returns Promise<void>
   */

  @SubscribeMessage(ChatEvent.CHAT_EDIT)
  @UseGuards(WsAuthGuard)
  async handleChatEdit(
    @WsAuthorization() payload: TokenPayload,
    @ChatEdit() { data: { description, tag, name, type }, ...body }: ChatSocket<IChatEdit>,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
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
      .where('LOWER(tag) = LOWER(:tag)', { tag: tag })
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
      tag: tag || chat.tag,
      name: name || chat.name,
      description: description || chat.description,
      type: (type && IChatType[type]) || chat.type,
    });

    this.server.to(body.chat).emit(ChatEvent.CHAT_EDIT, {
      chat: body.chat,
      tag: tag || chat.tag,
      name: name || chat.name,
      description: description || chat.description,
      type: (type && IChatType[type]) || chat.type,
    });
  }

  /**
   * Handler for editing chat messages
   *
   * @param payload payload of user jwt
   *
   * @param body body of the websocket
   *
   * @param client websocket instance
   *
   * @returns Promise<void>
   */

  @SubscribeMessage(ChatEvent.MESSAGE_EDIT)
  @UseGuards(WsAuthGuard)
  async handleMessageEdit(
    @WsAuthorization() payload: TokenPayload,
    @MessageEdit() body: IMessageEdit,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const message: DBResponse<Message> = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.uuid = :uuid', { uuid: body.message })
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
      text: body.text || message.text,
      pinned: body.pinned != null ? body.pinned : message.pinned,
      edited: message.edited + (body.text && body.text != message.text ? 1 : 0),
      editedAt: body.text && body.text != message.text ? new Date() : message.editedAt,
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
   * Handler for editing chat members
   *
   * @param payload payload of user jwt
   *
   * @param body body of the websocket
   *
   * @param client websocket instance
   *
   * @returns Promise<void>
   */

  @SubscribeMessage(ChatEvent.MEMBER_EDIT)
  @UseGuards(WsAuthGuard)
  async handleMemberEdit(
    @WsAuthorization() payload: TokenPayload,
    @MemberEdit() body: ChatSocket<IMemberEdit>,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
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
      return member.userUuid == body.data.user;
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
      if (body.data.role == IChatRole.OWNER) {
        return client.error("Admin Can't Change Owner");
      }
    }

    if (body.data.role === IChatRole.OWNER) {
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

    if (body.data.role === IChatRole.ADMIN) {
      if (member.role === IChatRole.ADMIN) {
        const admin: DBResponse<ChatAdmin> = chat.admins.find((admin: ChatAdmin) => {
          return admin.userUuid == body.data.user;
        });
        if (!admin) {
          await this.chatMemberRepository.save({ ...member, role: IChatRole.MEMBER });
          return client.error('Admin Not Found');
        }
        await this.chatAdminRepository.save({
          ...admin,
          permissions: await Promise.all(
            body.data.permissions.map(async (perm: IAdminPermission) => {
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
          ...body.data.permissions.map((perm: IAdminPermission) => {
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
        permissions: [body.data.permissions],
      });
    }

    if (body.data.role === IChatRole.MEMBER) {
      if (member.role === IChatRole.MEMBER) return;
      const admin: DBResponse<ChatAdmin> = chat.admins.find((admin: ChatAdmin) => {
        return admin.userUuid == body.data.user;
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
   * Handler to emit websockets to online chat members to remove
   *
   * the chat when the chat was deleted on runtime
   *
   * @param chatUuid uuid of Chat
   *
   * @returns Promise<void>
   */

  async handleChatDelete(chatUuid: string): Promise<void> {
    this.server.to(chatUuid).emit(ChatEvent.CHAT_DELETE, { chat: chatUuid });
  }

  /**
   * Handler to emit websockets to all online chat members
   *
   * when a new member joins the chat
   *
   * @param chatUuid uuid of Chat
   *
   * @param userUuid uuid of User
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<void>
   */

  async handleGroupUserJoin(
    chatUuid: string,
    userUuid: string,
    payload: TokenPayload
  ): Promise<void> {
    const sockets: { [id: string]: Socket } = this.server.clients().sockets;
    for (let socket in sockets) {
      const client: Socket = sockets[socket];
      const clientToken: string = client.handshake.headers['authorization']?.substr(7);
      if (clientToken) {
        const clientPayload: TokenPayload | undefined = AuthService.DecodeToken(clientToken);
        if (clientPayload?.user == payload.uuid) client.join(chatUuid);
      }
    }

    const chat: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .getOne();
    if (!chat) return; //maybe error message
    const member: DBResponse<ChatMember> = chat?.members.find((member: ChatMember) => {
      return member.userUuid == userUuid;
    });
    if (!member) return; //maybe error message
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
   * Handler to emit websockets to all online chat members
   *
   * when a new member left the chat
   *
   * @param chatUuid uuid of Chat
   *
   * @param userUuid uuid of User
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<void>
   */

  async handleGroupUserLeave(
    chatUuid: string,
    userUuid: string,
    payload: TokenPayload
  ): Promise<void> {
    const sockets: { [id: string]: Socket } = this.server.clients().sockets;
    for (let socket in sockets) {
      const client: Socket = sockets[socket];
      const clientToken: string = client.handshake.headers['authorization']?.substr(7);
      if (clientToken) {
        const clientPayload: TokenPayload | undefined = AuthService.DecodeToken(clientToken);
        if (clientPayload?.user == payload.uuid) client.leave(chatUuid);
      }
    }
    this.server.to(chatUuid).emit(ChatEvent.MEMBER_LEAVE, { chat: chatUuid, user: userUuid });
  }

  /**
   * Handler to emit websockets to all online chat members
   *
   * when a new member was banned from the chat
   *
   * @param chatUuid uuid of Chat
   *
   * @param userUuid uuid of User
   *
   * @returns Promise<void>
   */

  async handleGroupUserBan(chatUuid: string, userUuid: string): Promise<void> {
    const sockets: { [id: string]: Socket } = this.server.clients().sockets;
    for (let socket in sockets) {
      const client: Socket = sockets[socket];
      const token: string = client.handshake.headers['authorization']?.substr(7);
      try {
        const payload: TokenPayload = await this.authService.verifyToken(token);
        if (!payload || payload instanceof HttpException) return; //maybe error message -> to who (?)
        if (payload.user == userUuid) client.leave(chatUuid);

        this.server.to(chatUuid).emit(ChatEvent.MEMBER_BANNED, { chat: chatUuid, user: userUuid });
      } catch (exception) {
        if (exception instanceof HttpException) client.error(exception.message);
      }
    }
  }
}
