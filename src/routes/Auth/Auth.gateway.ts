import { HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { ChatMember } from '../../entities/ChatMember.entity';
import { User } from '../../entities/User.entity';
import { DBResponse } from '../../util/Types.type';
import { TokenPayload } from './Auth.interface';
import { AuthService } from './Auth.service';

@WebSocketGateway()
export class AuthGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private authService: AuthService
  ) {}

  /**
   * @param client websocket instance
   * @description handler for general websocket connection
   * @returns Promise<void>
   * @introduced 20.02.2021
   * @edited 23.02.2021
   */

  async handleConnection(client: Socket): Promise<void> {
    console.log(
      'connection',
      Object.values(client.nsp.sockets).map((socket: Socket) => socket.id)
    );
    const token: string = client.handshake.headers['authorization']?.substr(7);
    if (!Boolean(token)) return client.error('No Token Provided');
    try {
      const payload: TokenPayload = await this.authService.verifyToken(token);
      if (payload instanceof HttpException) return client.error(payload.message);
      const user: DBResponse<User> = await this.userRepository
        .createQueryBuilder('user')
        .where('user.uuid = :uuid', { uuid: payload.user })
        .leftJoinAndSelect('user.chats', 'chat')
        .getOne();
      if (!user) return client.error('User Not Found');
      await new Promise<void>((resolve) => {
        user?.chats.forEach((member: ChatMember) => {
          client.join(member.chatUuid.toString(), (err) => resolve());
        });
      });
      await this.userRepository.save({ ...user, online: true });
    } catch (exception) {
      if (exception instanceof HttpException) client.error(exception.message);
    }
  }

  /**
   * @param client websocket instance
   * @description handler for general websocket disconnection
   * @returns Promise<void>
   * @introduced 20.02.2021
   * @edited 23.02.2021
   */

  async handleDisconnect(client: Socket): Promise<void> {
    console.log(
      'disconnect',
      Object.values(client.nsp.sockets).map((socket: Socket) => socket.id)
    );
    const token: string = client.handshake.headers['authorization']?.substr(7);
    try {
      const payload: TokenPayload = await this.authService.verifyToken(token);
      if (payload instanceof HttpException) return;
      else {
        const user: DBResponse<User> = await this.userRepository
          .createQueryBuilder('user')
          .where('user.uuid = :uuid', { uuid: payload.user })
          .getOne();
        if (!user) {
          client.error('User Not Found');
          client.disconnect(true);
        }
        this.userRepository.save({ ...user, lastSeen: new Date(), online: false });
      }
    } catch (exception) {
      if (exception instanceof HttpException) client.error(exception.message);
    }
  }
}
