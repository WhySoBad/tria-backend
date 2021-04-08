import {
  BadRequestException,
  Body,
  forwardRef,
  Inject,
  Injectable,
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
import { Chat } from '../../entities/Chat.entity';
import { ChatAdmin } from '../../entities/ChatAdmin.entity';
import { ChatMember } from '../../entities/ChatMember.entity';
import { Message } from '../../entities/Message.entity';
import { User } from '../../entities/User.entity';
import { TokenPayload } from '../Auth/Jwt/Jwt.interface';
import { ChatEvent, ChatType, GroupRole } from './Chat.interface';
import WsExceptionFilter from '../../filters/WsExceptionFilter.filter';
import { JwtService } from '../Auth/Jwt/Jwt.service';
import { ChatService } from './Chat.service';
import { MessageDto } from '../../pipes/validation/MessageDto.dto';
import Authorization from '../../decorators/Authorization.decorator';
import AuthGuard from '../../guards/AuthGuard';
import { ChatEditDto } from '../../pipes/validation/ChatEditDto.dto';
import { MessageEditDto } from '../../pipes/validation/MessageEditDto.dto';
import { MemberEditDto } from '../../pipes/validation/MemberEditDto.dto';

@WebSocketGateway()
@Injectable()
export class ChatGateway {
  constructor(
    @InjectRepository(Chat) private chatRepository: Repository<Chat>,
    @Inject(forwardRef(() => ChatService)) private chatService: ChatService,
    private jwtService: JwtService
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
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @UseFilters(WsExceptionFilter)
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
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @UseGuards(AuthGuard)
  @UseFilters(WsExceptionFilter)
  async handleChatEdit(
    @Authorization() payload: TokenPayload,
    @Body() body: ChatEditDto,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    try {
      const chat: Chat = await this.chatService.handleChatEdit(body.chat, body, payload);
      this.server.to(body.chat).emit(ChatEvent.CHAT_EDIT, {
        chat: body.chat,
        tag: chat.tag,
        name: chat.name,
        description: chat.description,
        type: ChatType[chat.type],
      });
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
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @UseGuards(AuthGuard)
  @UseFilters(WsExceptionFilter)
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
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @UseGuards(AuthGuard)
  @UseFilters(WsExceptionFilter)
  async handleMemberEdit(
    @Authorization() payload: TokenPayload,
    @Body() body: MemberEditDto,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    console.log(body);
    try {
      const member:
        | Array<ChatMember>
        | ChatMember
        | ChatAdmin = await this.chatService.handleMemberEdit(body.chat, body, payload);

      if (member instanceof ChatAdmin) {
        this.server.to(body.chat).emit(ChatEvent.MEMBER_EDIT, {
          chat: body.chat,
          user: member.userUuid,
          role: 'ADMIN',
          permissions: member.permissions,
        });
        if (body.actionUuid) {
          this.server.to(client.id).emit(ChatEvent.ACTION_SUCCESS, body.actionUuid);
        }
      } else if (Array.isArray(member)) {
        member.forEach((member: ChatMember) => {
          this.server.to(body.chat).emit(ChatEvent.MEMBER_EDIT, {
            chat: body.chat,
            user: member.userUuid,
            role: GroupRole[member.role],
            permissions: [],
          });
          if (body.actionUuid) {
            this.server.to(client.id).emit(ChatEvent.ACTION_SUCCESS, body.actionUuid);
          }
        });
      } else {
        this.server.to(body.chat).emit(ChatEvent.MEMBER_EDIT, {
          chat: body.chat,
          user: member.userUuid,
          role: GroupRole[member.role],
          permissions: [],
        });
        if (body.actionUuid) {
          this.server.to(client.id).emit(ChatEvent.ACTION_SUCCESS, body.actionUuid);
        }
      }
    } catch (exception) {
      throw exception;
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
        const clientPayload: TokenPayload | undefined = JwtService.DecodeToken(clientToken);
        if (clientPayload?.user == payload.uuid) client.join(chatUuid);
      }
    }

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
      user: {
        uuid: user.uuid,
        joinedAt: member.joinedAt,
        createdAt: user.createdAt,
        role: GroupRole[member.role],
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
      const clientToken: string = client.handshake.headers.authorization;
      if (clientToken) {
        const clientPayload: TokenPayload | undefined = JwtService.DecodeToken(clientToken);
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

  @UseFilters(WsExceptionFilter)
  async handleMemberBan(chatUuid: string, userUuid: string): Promise<void> {
    const sockets: { [id: string]: Socket } = this.server.clients().sockets;
    for (let socket in sockets) {
      const client: Socket = sockets[socket];
      const token: string = client.handshake.headers.authorization;
      try {
        const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
        if (!payload) throw new BadRequestException('Invalid Token');
        const banned: boolean = await this.jwtService.isTokenBanned(payload.uuid);
        if (banned) throw new BadRequestException('Token Is Banned');
        if (payload.user == userUuid) client.leave(chatUuid);

        this.server.to(chatUuid).emit(ChatEvent.MEMBER_BAN, { chat: chatUuid, user: userUuid });
      } catch (exception) {
        throw exception;
      }
    }
  }

  @UseFilters(WsExceptionFilter)
  async handleMemberUnban(chatUuid: string, userUuid: string): Promise<void> {
    const sockets: { [id: string]: Socket } = this.server.clients().sockets;
    for (let socket in sockets) {
      const client: Socket = sockets[socket];
      const token: string = client.handshake.headers.authorization;
      try {
        const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
        if (!payload) throw new BadRequestException('Invalid Token');
        const banned: boolean = await this.jwtService.isTokenBanned(payload.uuid);
        if (banned) throw new BadRequestException('Token Is Banned');
        if (payload.user == userUuid) client.join(chatUuid);

        this.server.to(chatUuid).emit(ChatEvent.MEMBER_UNBAN, { chat: chatUuid, user: userUuid });
      } catch (exception) {
        throw exception;
      }
    }
  }
}
