import {
  BadRequestException,
  HttpException,
  Injectable,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { ChatMember } from '../../entities/ChatMember.entity';
import { User } from '../../entities/User.entity';
import WsExceptionFilter from '../../filters/WsExceptionFilter.filter';
import { AuthService } from '../Auth/Auth.service';
import { UserEvent } from './User.interface';

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
  namespace: '/user',
})
@UseFilters(WsExceptionFilter)
@UsePipes(new ValidationPipe({ whitelist: true }))
@Injectable()
export class UserGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private authService: AuthService
  ) {}

  @WebSocketServer() nsp: Namespace;

  /**
   * Handler for user websocket connection
   *
   * @param client websocket instance
   *
   * @returns Promise<void>
   */

  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    const token: string = client.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) client.error(new BadRequestException('Missing Token').getResponse());
    try {
      const user: User = await this.authService.handleConnect(token, false);
      client.join(user.uuid);
    } catch (exception) {
      if (exception instanceof HttpException) client.error(exception.getResponse());
    }
  }

  /**
   * Handler for user websocket disconnection
   *
   * @param client websocket instance
   *
   * @returns Promise<void>
   */

  async handleDisconnect(@ConnectedSocket() client: Socket): Promise<void> {
    const token: string = client.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) return client.error(new BadRequestException('Missing Token').getResponse());
    try {
      const user: User = await this.authService.handleDisconnect(token, false);
      client.leave(user.uuid);
    } catch (exception) {
      if (exception instanceof HttpException) client.error(exception.getResponse());
    }
  }

  /**
   * Handler to emit changes to all contacts when
   *
   * user was edited
   *
   * @param user edited user
   *
   * @returns Promise<void>
   */

  async handleUserEdit(user: User): Promise<void> {
    const contacts: Array<string> = await this.getContacts(user.uuid);
    contacts.forEach((uuid: string) => {
      this.nsp.to(uuid).emit(UserEvent.USER_EDIT, {
        user: user.uuid,
        name: user.name,
        tag: user.tag,
        description: user.description,
        locale: user.locale,
        avatar: user.avatar,
      });
    });
  }

  /**
   * Handler to emit deletion of an user to all contacts
   *
   * @param user deleted user
   *
   * @returns Promise<void>
   */

  async handleUserDelete(user: User): Promise<void> {
    const contacts: Array<string> = await this.getContacts(user.uuid);
    contacts.forEach((uuid: string) => {
      this.nsp.to(uuid).emit(UserEvent.USER_DELETE, {
        user: user.uuid,
      });
    });
  }

  /**
   * Function to get all unique contacts of an user
   *
   * @param userUuid uuid of user
   *
   * @returns Promise<Array<string>>
   */

  async getContacts(userUuid: string): Promise<Array<string>> {
    const user: User | undefined = await this.userRepository
      .createQueryBuilder('user')
      .where('user.uuid = :uuid', { uuid: userUuid })
      .leftJoinAndSelect('user.chats', 'chats')
      .leftJoinAndSelect('chats.chat', 'chat')
      .leftJoinAndSelect('chat.messages', 'message')
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('members.user', 'member_user')
      .getOne();

    if (!user) return [];
    let contacts: Array<string> = [];
    user.chats.forEach(({ chat: { members } }: ChatMember) => {
      members.forEach((contact: ChatMember) => {
        contact.userUuid !== userUuid && contacts.push(contact.userUuid);
      });
    });

    return [...new Set(contacts)];
  }
}
