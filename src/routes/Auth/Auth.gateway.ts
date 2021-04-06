import {
  BadRequestException,
  HttpException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { ChatMember } from '../../entities/ChatMember.entity';
import { User } from '../../entities/User.entity';
import { TokenPayload } from './Auth.interface';
import { JwtService } from './Jwt/Jwt.service';

@WebSocketGateway()
export class AuthGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService
  ) {}

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

  async handleConnection(@ConnectedSocket() client: Socket) {
    const token: string = client.handshake.headers.authorization;
    if (!token) return client.error(new BadRequestException('Missing Token'));
    const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
    if (!payload) return client.error(new BadRequestException('Invalid Token'));
    const banned: boolean = await this.jwtService.isTokenBanned(payload.uuid);
    if (banned) return client.error(new UnauthorizedException('Token Is Banned'));

    this.logger.log(`User connected [${payload.user}, ${client.id}]`);

    try {
      const user: User | undefined = await this.userRepository
        .createQueryBuilder('user')
        .where('user.uuid = :uuid', { uuid: payload.user })
        .leftJoinAndSelect('user.chats', 'chat')
        .getOne();
      if (!user) throw new NotFoundException('User Not Found');
      await new Promise<void>((resolve) => {
        user?.chats.forEach((member: ChatMember) => {
          client.join(member.chatUuid.toString(), resolve);
        });
      });
      await this.userRepository.save({ ...user, online: true });
    } catch (exception) {
      if (exception instanceof HttpException) throw exception;
    }
  }

  /**
   * Handler for general websocket disconnection
   *
   * @param client websocket instance
   *
   * @returns Promise<void>
   */

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    const token: string = client.handshake.headers.authorization;
    if (!token) return client.error(new BadRequestException('Missing Token'));
    const payload: TokenPayload | undefined = JwtService.DecodeToken(token);
    if (!payload) return client.error(new BadRequestException('Invalid Token'));
    const banned: boolean = await this.jwtService.isTokenBanned(payload.uuid);
    if (banned) return client.error(new UnauthorizedException('Token Is Banned'));

    this.logger.log(`User disconnected [${payload.user}, ${client.id}]`);

    try {
      const user: User | undefined = await this.userRepository
        .createQueryBuilder('user')
        .where('user.uuid = :uuid', { uuid: payload.user })
        .leftJoinAndSelect('user.chats', 'chat')
        .getOne();
      if (!user) throw new NotFoundException('User Not Found');
      await this.userRepository.save({ ...user, online: false });
    } catch (exception) {
      if (exception instanceof HttpException) throw exception;
    }
  }
}
