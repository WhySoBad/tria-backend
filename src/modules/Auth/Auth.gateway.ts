import { BadRequestException, HttpException, Logger } from '@nestjs/common';
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
import { ChatEvent } from '../Chat/Chat.interface';
import { AuthService } from './Auth.service';
import { TokenPayload } from './Jwt/Jwt.interface';
import { JwtService } from './Jwt/Jwt.service';

@WebSocketGateway({
  handlePreflightRequest: (req: any, res: any) => {
    const headers = {
      'Access-Control-Allow-Headers': 'Authorization',
      'Access-Control-Allow-Origin': 'http://localhost:8000',
      'Access-Control-Allow-Credentials': true,
    };
    res.writeHead(200, headers);
    res.end();
  },
})
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

  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    const token: string = client.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) client.error(new BadRequestException('Missing Token').getResponse());
    if ((await this.timesOnline(token)) > 1) {
      client.error(new BadRequestException('User Is Already Online').getResponse());
      client.disconnect(true);
    } else {
      try {
        const user: User = await this.authService.handleConnect(token);
        await new Promise((resolve) => {
          user.chats.forEach(({ chatUuid }) => {
            client.join(chatUuid, resolve);
          });
        });
        await this.emitToAllContacts(user, ChatEvent.MEMBER_ONLINE);
        this.logger.log(`User connected [${user.uuid}, ${client.id}]`);
      } catch (exception) {
        if (exception instanceof HttpException) client.error(exception.getResponse());
      }
    }
  }

  /**
   * Handler for general websocket disconnection
   *
   * @param client websocket instance
   *
   * @returns Promise<void>
   */

  async handleDisconnect(@ConnectedSocket() client: Socket): Promise<void> {
    const token: string = client.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) return client.error(new BadRequestException('Missing Token').getResponse());
    if ((await this.timesOnline(token)) === 0) {
      try {
        const user: User = await this.authService.handleDisconnect(token);
        await this.emitToAllContacts(user, ChatEvent.MEMBER_OFFLINE);
        this.logger.log(`User disconnected [${user.uuid}, ${client.id}]`);
      } catch (exception) {
        if (exception instanceof HttpException) client.error(exception.getResponse());
      }
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

  /**
   * Function to get how many times the user is online
   *
   * @param token user jwt
   *
   * @returns Promise<number>
   */

  private async timesOnline(token: string): Promise<number> {
    const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
    if (!payload) return 0;

    const sockets: { [id: string]: Socket } = this.server.clients().sockets;
    let online: number = 0;
    for (let socket in sockets) {
      const client: Socket = sockets[socket];
      const token: string = client.handshake.headers.authorization;
      if (token) {
        const { user }: TokenPayload | any = JwtService.DecodeToken(token) || {};
        if (payload.user === user) online++;
      }
    }
    return online;
  }

  /**
   * Function to parse the cookies of an incoming request
   *
   * @param cookies cookies string
   *
   * @returns object
   */

  private parseCookies: (cookies: string) => { [name: string]: string } = (cookies: string) => {
    const split: Array<string> = cookies?.split('; ') || [];
    const parsed: { [name: string]: string } = {};
    split.forEach((cookie: string) => {
      const split: Array<string> = cookie.split('=');
      parsed[split[0]] = split[1];
    });
    return parsed;
  };
}
