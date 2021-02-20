import { HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { Chat } from '../../entities/Chat.entity';
import { ChatMember } from '../../entities/ChatMember.entity';
import { Message } from '../../entities/Message.entity';
import { User } from '../../entities/User.entity';
import { DBResponse, HandleService } from '../../util/Types.type';
import { TokenPayload } from '../Auth/Auth.interface';
import { AuthService } from '../Auth/Auth.service';
import { WSChatMessage } from './Chat.interface';

@WebSocketGateway({ namespace: 'chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Chat) private chatRepository: Repository<Chat>,
    @InjectRepository(Message) private messageRepository: Repository<Message>,
    private authService: AuthService
  ) {}

  @WebSocketServer() server: Server;

  /**
   * @param client websocket instance
   * @description
   * @introduced 19.02.2021
   * @edited 19.02.2021
   */

  async handleConnection(client: Socket) {
    const token: string = client.handshake.headers['authorization'];
    if (!Boolean(token)) {
      client.error('No Token Provided');
      client.disconnect(true);
    }
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) {
      client.error(payload.message);
      client.disconnect(true);
    } else {
      const user: DBResponse<User> = await this.userRepository
        .createQueryBuilder('user')
        .where('user.uuid = :uuid', { uuid: payload.user })
        .leftJoinAndSelect('user.chats', 'chat')
        .getOne();
      if (!user) {
        client.error('User Not Found');
        client.disconnect(true);
      }
      await new Promise<void>((resolve) => {
        user?.chats.forEach((member: ChatMember) => {
          client.join(member.chatUuid.toString(), (err) => {
            resolve();
          });
        });
      });
    }
  }

  /**
   * @param client websocket instance
   * @description
   * @introduced 19.02.2021
   * @edited 19.02.2021
   */

  async handleDisconnect(client: Socket): Promise<void> {
    const token: string = client.handshake.headers['authorization'];
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return;
    else {
      const user: DBResponse<User> = await this.userRepository.findOne({ uuid: payload.user });
      await this.userRepository.save({ ...user, lastSeen: new Date() });
    }
  }

  /**
   * @param message
   * @param client
   * @description
   * @introduced 19.02.2021
   * @edited 19.02.2021
   */

  @SubscribeMessage('message')
  async handleMessage(
    @MessageBody() body: WSChatMessage,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const token: string = client.handshake.headers['authorization'];
    if (!Boolean(token)) {
      client.error('No Token Provided');
      client.disconnect(true);
    }
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return client.error(payload.message);
    else {
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

      this.server.to(body.chat).emit('message', {
        chat: body.chat,
        message: {
          uuid: message.uuid,
          chatUuid: message.chatUuid,
          userUuid: message.userUuid,
          createdAt: message.createdAt,
          editedAt: message.editedAt,
          pinned: message.pinned,
          text: message.text,
        },
      });
    }
  }

  async handleChatEdit(): Promise<void> {}

  async handleChatDelete(): Promise<void> {}

  async handleMessageEdit(): Promise<void> {}

  async handleGroupUserJoin(): Promise<void> {}

  async handleGroupUserLeave(): Promise<void> {}
}
