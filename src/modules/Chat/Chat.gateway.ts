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
import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { Chat } from '../../entities/Chat.entity';
import { ChatAdmin } from '../../entities/ChatAdmin.entity';
import { ChatMember } from '../../entities/ChatMember.entity';
import { Message } from '../../entities/Message.entity';
import { User } from '../../entities/User.entity';
import { TokenPayload, TokenType } from '../Auth/Jwt/Jwt.interface';
import { ChatEvent, IChatRole } from './Chat.interface';
import WsExceptionFilter from '../../filters/WsExceptionFilter.filter';
import { JwtService } from '../Auth/Jwt/Jwt.service';
import { ChatService } from './Chat.service';
import { MessageSocket } from '../../pipes/validation/MessageSocket.pipe';
import Authorization from '../../decorators/Authorization.decorator';
import AuthGuard from '../../guards/AuthGuard';
import { ChatEditSocket } from '../../pipes/validation/ChatEditSocket.pipe';
import { MessageEditSocket } from '../../pipes/validation/MessageEditSocket.pipe';
import { MemberEditSocket } from '../../pipes/validation/MemberEditSocket.pipe';

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
    @Body() body: MessageSocket
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
    @Body() body: ChatEditSocket
  ): Promise<void> {
    try {
      const chat: Chat = await this.chatService.handleChatEdit(body.chat, body, payload);
      this.server.to(body.chat).emit(ChatEvent.CHAT_EDIT, {
        chat: body.chat,
        tag: chat.tag,
        name: chat.name,
        description: chat.description,
        type: chat.type,
      });
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
    @Body() body: MessageEditSocket
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
    @Body() body: MemberEditSocket
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
      } else if (Array.isArray(member)) {
        member.forEach((member: ChatMember) => {
          this.server.to(body.chat).emit(ChatEvent.MEMBER_EDIT, {
            chat: body.chat,
            user: member.userUuid,
            role: IChatRole[member.role],
            permissions: [],
          });
        });
      } else {
        this.server.to(body.chat).emit(ChatEvent.MEMBER_EDIT, {
          chat: body.chat,
          user: member.userUuid,
          role: IChatRole[member.role],
          permissions: [],
        });
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
  async handleGroupUserBan(chatUuid: string, userUuid: string): Promise<void> {
    const sockets: { [id: string]: Socket } = this.server.clients().sockets;
    for (let socket in sockets) {
      const client: Socket = sockets[socket];
      const token: string = client.handshake.headers['authorization']?.substr(7);
      try {
        const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
        if (!payload) throw new BadRequestException('Invalid Token');
        const banned: boolean = await this.jwtService.isTokenBanned(payload.uuid);
        if (banned) throw new BadRequestException('Token Is Banned');
        if (payload.user == userUuid) client.leave(chatUuid);

        this.server.to(chatUuid).emit(ChatEvent.MEMBER_BANNED, { chat: chatUuid, user: userUuid });
      } catch (exception) {
        throw exception;
      }
    }
  }
}
