import {
  Body,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import Authorization from '../../decorators/Authorization.decorator';
import { AdminPermission } from '../../entities/AdminPermission.entity';
import { BannedMember } from '../../entities/BannedMember.entity';
import { Chat } from '../../entities/Chat.entity';
import { ChatAdmin } from '../../entities/ChatAdmin.entity';
import { ChatMember } from '../../entities/ChatMember.entity';
import { MemberLog } from '../../entities/MemberLog.entity';
import { Message } from '../../entities/Message.entity';
import { User } from '../../entities/User.entity';
import WsExceptionFilter from '../../filters/WsExceptionFilter.filter';
import AuthGuard from '../../guards/AuthGuard.guard';
import { ChatEditDto } from '../../pipes/validation/ChatEditDto.dto';
import { MemberEditDto } from '../../pipes/validation/MemberEditDto.dto';
import { MessageDto } from '../../pipes/validation/MessageDto.dto';
import { MessageEditDto } from '../../pipes/validation/MessageEditDto.dto';
import { TokenPayload } from '../Auth/Jwt/Jwt.interface';
import { JwtService } from '../Auth/Jwt/Jwt.service';
import { ChatEvent, ChatType, GroupRole, Permission } from './Chat.interface';
import { ChatService } from './Chat.service';

@WebSocketGateway({
  handlePreflightRequest: (req: any, res: any) => {
    const headers = {
      'Access-Control-Allow-Headers': 'Authorization',
      'Access-Control-Allow-Origin': req.headers.origin,
      'Access-Control-Allow-Credentials': true,
    };
    res.writeHead(200, headers);
    res.end();
  },
})
@UseFilters(WsExceptionFilter)
@UsePipes(new ValidationPipe({ whitelist: true }))
@Injectable()
export class ChatGateway {
  constructor(
    @InjectRepository(Chat) private chatRepository: Repository<Chat>,
    @Inject(forwardRef(() => ChatService)) private chatService: ChatService
  ) {}

  @WebSocketServer() server: Server;

  /**
   * Handler for sending new messages
   *
   * @param payload payload of user jwt
   *
   * @param body body of the websocket
   *
   * @returns Promise<void>
   */

  @SubscribeMessage(ChatEvent.MESSAGE)
  @UseGuards(AuthGuard)
  async handleMessage(
    @Authorization() payload: TokenPayload,
    @Body() body: MessageDto,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    try {
      const message: Message = await this.chatService.handleMessage(body.chat, body.data, payload);
      this.server.to(body.chat).emit(ChatEvent.MESSAGE, {
        uuid: message.uuid,
        chat: message.chatUuid,
        sender: message.userUuid,
        createdAt: message.createdAt,
        editedAt: message.editedAt,
        pinned: message.pinned,
        text: message.text,
      });
      if (body.actionUuid) {
        this.server.to(client.id).emit(ChatEvent.ACTION_SUCCESS, body.actionUuid);
      }
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Handler for editing a chat
   *
   * @param payload payload of user jwt
   *
   * @param body body of the websocket
   *
   * @returns Promise<void>
   */

  @SubscribeMessage(ChatEvent.CHAT_EDIT)
  @UseGuards(AuthGuard)
  async handleChatEdit(
    @Authorization() payload: TokenPayload,
    @Body() body: ChatEditDto,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    try {
      const chat: Chat = await this.chatService.handleChatEdit(body.chat, body, payload);
      this.handleEdit(chat);
      if (body.actionUuid) {
        this.server.to(client.id).emit(ChatEvent.ACTION_SUCCESS, body.actionUuid);
      }
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Handler for editing chat messages
   *
   * @param payload payload of user jwt
   *
   * @param body body of the websocket
   *
   * @returns Promise<void>
   */

  @SubscribeMessage(ChatEvent.MESSAGE_EDIT)
  @UseGuards(AuthGuard)
  async handleMessageEdit(
    @Authorization() payload: TokenPayload,
    @Body() body: MessageEditDto,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    try {
      const message: Message = await this.chatService.handleMessageEdit(body, payload);
      this.server.to(message.chatUuid).emit(ChatEvent.MESSAGE_EDIT, {
        chat: message.chatUuid,
        message: message.uuid,
        text: message.text,
        pinned: message.pinned,
        edited: message.edited,
        editedAt: message.editedAt,
      });
      if (body.actionUuid) {
        this.server.to(client.id).emit(ChatEvent.ACTION_SUCCESS, body.actionUuid);
      }
    } catch (exception) {
      throw exception;
    }
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
  @UseGuards(AuthGuard)
  async handleMemberEdit(
    @Authorization() payload: TokenPayload,
    @Body() body: MemberEditDto,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    try {
      const member:
        | Array<ChatMember>
        | ChatMember
        | ChatAdmin = await this.chatService.handleMemberEdit(body.chat, body, payload);

      if (Array.isArray(member)) {
        member.forEach((member: ChatMember) => {
          this.server.to(body.chat).emit(ChatEvent.MEMBER_EDIT, {
            chat: body.chat,
            user: member.userUuid,
            role: GroupRole[member.role],
            permissions: [],
          });
        });
      } else if (member instanceof ChatAdmin) {
        this.server.to(body.chat).emit(ChatEvent.MEMBER_EDIT, {
          chat: body.chat,
          user: member.userUuid,
          role: 'ADMIN',
          permissions: member.permissions.map(({ permission }: AdminPermission) => {
            return Permission[permission];
          }),
        });
      } else {
        this.server.to(body.chat).emit(ChatEvent.MEMBER_EDIT, {
          chat: body.chat,
          user: member.userUuid,
          role: GroupRole[member.role],
          permissions: [],
        });
      }
      if (body.actionUuid) {
        this.server.to(client.id).emit(ChatEvent.ACTION_SUCCESS, body.actionUuid);
      }
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Handler to emit websockets when a chat was edited
   *
   * @param chat chat which was edited
   *
   * @returns Promise<void>
   */

  async handleEdit(chat: Chat): Promise<void> {
    this.server.to(chat.uuid).emit(ChatEvent.CHAT_EDIT, {
      chat: chat.uuid,
      tag: chat.tag,
      name: chat.name,
      description: chat.description,
      type: ChatType[chat.type],
      avatar: chat.avatar,
    });
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
    const sockets: Array<Socket> = Object.values(this.server.to(chatUuid).sockets);
    for await (const socket of sockets) {
      await new Promise((resolve) => socket.leave(chatUuid, resolve));
    }
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
    const client = await this.getSocketForUser(userUuid);
    if (client) await new Promise((resolve) => client.join(chatUuid, resolve));

    const chat: Chat | undefined = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .getOne();
    if (!chat) return; //maybe error message
    const member: ChatMember | undefined = chat.members.find((member: ChatMember) => {
      return member.userUuid == userUuid;
    });
    if (!member) return; //maybe error message
    const user: User = member.user;

    this.server.to(chatUuid).emit(ChatEvent.MEMBER_JOIN, {
      chat: chatUuid,
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
   *
   * @returns Promise<void>
   */

  async handleGroupUserLeave(chatUuid: string, userUuid: string): Promise<void> {
    this.server.to(chatUuid).emit(ChatEvent.MEMBER_LEAVE, { chat: chatUuid, user: userUuid });
    const sockets: { [id: string]: Socket } = this.server.clients().sockets;
    for (let socket in sockets) {
      const client: Socket = sockets[socket];
      const clientToken: string = client.handshake.headers.authorization;
      if (clientToken) {
        const clientPayload: TokenPayload | undefined = JwtService.DecodeToken(clientToken);
        if (clientPayload?.user === userUuid) client.leave(chatUuid);
      }
    }
  }

  /**
   * Handler to emit websockets to all online chat members
   *
   * when a new member was banned from the chat
   *
   * @param chatUuid uuid of the chat
   *
   * @param userUuid uuid of the user
   *
   * @returns Promise<void>
   */

  async handleMemberBan(chatUuid: string, userUuid: string): Promise<void> {
    const sockets: { [id: string]: Socket } = this.server.clients().sockets;
    for (let socket in sockets) {
      const client: Socket = sockets[socket];
      const token: string = client.handshake.headers.authorization;
      try {
        const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
        if (payload) {
          if (payload.user == userUuid) client.leave(chatUuid);
        }
      } catch (exception) {}
    }
    this.server.to(chatUuid).emit(ChatEvent.MEMBER_BAN, { chat: chatUuid, user: userUuid });
  }

  /**
   * Handler to emit websockets to all online chat members and the banned member
   *
   * @param chatUuid uuid of the chat
   *
   * @param userUuid uuid of the user
   *
   * @returns Promise<void>
   */

  async handleMemberUnban(chatUuid: string, userUuid: string): Promise<void> {
    try {
      const client: Socket | undefined = await this.getSocketForUser(userUuid);
      if (!client) throw new NotFoundException('User Not Found');
      if (client) client.emit(ChatEvent.MEMBER_UNBAN, { chat: chatUuid, user: userUuid });
    } catch (exception) {}
    this.server.to(chatUuid).emit(ChatEvent.MEMBER_UNBAN, { chat: chatUuid, user: userUuid });
  }

  /**
   * Handler to emit websockets to all online members of the new private chat
   *
   * @param chat new created chat
   *
   * @returns Promise<void>
   */

  async handlePrivateCreate(chat: Chat): Promise<void> {
    await Promise.all(
      chat.members.map(async (member: ChatMember) => {
        try {
          const client: Socket | undefined = await this.getSocketForUser(member.userUuid);
          if (client) await new Promise((resolve) => client.join(chat.uuid, resolve));
        } catch (exception) {}
      })
    );
    this.server.to(chat.uuid).emit(ChatEvent.PRIVATE_CREATE, {
      uuid: chat.uuid,
      type: ChatType[chat.type],
      createdAt: chat.createdAt,
      messages: [],
      memberLog: chat.memberLog.map((memberLog: MemberLog) => {
        return {
          user: memberLog.userUuid,
          chat: memberLog.chatUuid,
          timestamp: memberLog.timestamp,
          joined: memberLog.joined,
        };
      }),
      members: chat.members.map((member: ChatMember) => {
        const user: User = member.user;
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
        };
      }),
    });
  }

  /**
   * Handler to emit websockets to all online members of a new group chat
   *
   * @param chat new created chat
   *
   * @returns Promise<void>
   */

  async handleGroupCreate(chat: Chat): Promise<void> {
    await Promise.all(
      chat.members.map(async (member: ChatMember) => {
        try {
          const client: Socket | undefined = await this.getSocketForUser(member.userUuid);
          if (client) await new Promise((resolve) => client.join(chat.uuid, resolve));
        } catch (exception) {}
      })
    );

    const admins: Array<ChatAdmin> = chat.admins;

    this.server.to(chat.uuid).emit(ChatEvent.GROUP_CREATE, {
      uuid: chat.uuid,
      type: ChatType[chat.type],
      name: chat.name,
      tag: chat.tag,
      description: chat.description,
      createdAt: chat.createdAt,
      memberLog: chat.memberLog.map((memberLog: MemberLog) => {
        return {
          user: memberLog.userUuid,
          chat: memberLog.chatUuid,
          timestamp: memberLog.timestamp,
          joined: memberLog.joined,
        };
      }),
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
          },
        };
      }),
    });
  }

  /**
   * Function to emit to an user when a message was
   *
   * successfully read
   *
   * @param userUuid uuid of the user who read the message
   *
   * @param chatUuid uuid of the chat in which the messages were read
   *
   * @param timestamp timestamp of the last read message
   *
   * @returns Promise<void>
   */

  async handleMessageRead(userUuid: string, chatUuid: string, timestamp: Date): Promise<void> {
    this.server
      .of('/user')
      .to(userUuid)
      .emit(ChatEvent.MESSAGE_READ, { chat: chatUuid, timestamp: timestamp.getTime() });
  }

  /**
   * Function to get a connected socket by the user uuid
   *
   * @param uuid uuid of the user
   *
   * @returns Promise<Socket | undefined>
   */

  private async getSocketForUser(uuid: string): Promise<Socket | undefined> {
    const sockets: Array<Socket> = Object.values(this.server.clients().sockets);
    for (const client of sockets) {
      const token: string = client.handshake.headers.authorization;
      try {
        const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
        if (!payload) continue;
        if (payload.user === uuid) return client;
      } catch (exception) {
        throw exception;
      }
    }
    return undefined;
  }
}
