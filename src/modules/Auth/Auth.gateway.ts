import { BadRequestException, Logger, UseFilters } from '@nestjs/common';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatMember } from '../../entities/ChatMember.entity';
import { User } from '../../entities/User.entity';
import WsExceptionFilter from '../../filters/WsExceptionFilter.filter';
import { ChatEvent } from '../Chat/Chat.interface';
import { AuthService } from './Auth.service';
import { TokenPayload } from './Jwt/Jwt.interface';
import { JwtService } from './Jwt/Jwt.service';

@WebSocketGateway()
export class AuthGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private authService: AuthService) {}

  @WebSocketServer()
  private server: Server;

  /**
   * Handler for general websocket connection
   *
   * @param client websocket instance
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<void>
   */

  private logger: Logger = new Logger('AppGateway');

  @UseFilters(WsExceptionFilter)
  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    const token: string = client.handshake.headers.authorization;
    if (!token) throw new BadRequestException('Missing Token');

    try {
      const user: User = await this.authService.handleConnect(token);
      await this.emitToAllContacts(user, ChatEvent.MEMBER_ONLINE);
      this.logger.log(`User connected [${user.uuid}, ${client.id}]`);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Handler for general websocket disconnection
   *
   * @param client websocket instance
   *
   * @returns Promise<void>
   */

  @UseFilters(WsExceptionFilter)
  async handleDisconnect(@ConnectedSocket() client: Socket): Promise<void> {
    const token: string = client.handshake.headers.authorization;
    if (!token) return client.error(new BadRequestException('Missing Token'));

    try {
      const user: User = await this.authService.handleDisconnect(token);
      await this.emitToAllContacts(user, ChatEvent.MEMBER_OFFLINE);
      this.logger.log(`User disconnected [${user.uuid}, ${client.id}]`);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Function to emit a connect/disconnect event to all contacts of an user
   *
   * @param user user who joined
   *
   * @param event event to be emitted
   *
   * @returns Promise<void>
   */

  private async emitToAllContacts(user: User, event: ChatEvent): Promise<void> {
    const allContacts: Array<string> = Array.prototype.concat.apply(
      [],
      user.chats.map((member: ChatMember) => member.chat.members.map(({ userUuid }) => userUuid))
    );

    const uniqueContacts: Array<string> = [...new Set<string>(allContacts)].filter(
      (uuid: string) => uuid !== user.uuid
    );

    const sockets: { [id: string]: Socket } = this.server.clients().sockets;
    for (let socket in sockets) {
      const client: Socket = sockets[socket];
      const token: string = client.handshake.headers.authorization;
      if (token) {
        const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
        if (!payload) return;
        if (uniqueContacts.includes(payload.user)) {
          client.emit(event, user.uuid);
        }
      }
    }
  }
}
