import { HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { User } from '../../entities/User.entity';
import { DBResponse, HandleService } from '../../util/Types.type';
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
   * @edited 21.02.2021
   */

  async handleConnection(client: Socket): Promise<void> {
    const token: string = client.handshake.headers['authorization'].substr(7);
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
        .getOne();
      if (!user) {
        client.error('User Not Found');
        client.disconnect(true);
      }
      this.userRepository.save({ ...user, online: true });
    }
  }

  /**
   * @param client websocket instance
   * @description handler for general websocket disconnection
   * @returns Promise<void>
   * @introduced 20.02.2021
   * @edited 21.02.2021
   */

  async handleDisconnect(client: Socket): Promise<void> {
    const token: string = client.handshake.headers['authorization'].substr(7);
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
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
      this.userRepository.save({ ...user, online: false });
    }
  }
}
