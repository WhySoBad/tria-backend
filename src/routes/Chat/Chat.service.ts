import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from '../../entities/Chat.entity';
import { ChatMember } from '../../entities/ChatMember.entity';
import { User } from '../../entities/User.entity';
import { DBResponse, HandleService } from '../../util/Types.type';
import { TokenPayload } from '../Auth/Auth.interface';
import { AuthService } from '../Auth/Auth.service';
import {
  IChatRole,
  IChatType,
  IGroupChat,
  IPrivateChat,
} from './Chat.interface';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat) private chatRepository: Repository<Chat>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(ChatMember)
    private chatMemberRepository: Repository<ChatMember>,
    private authService: AuthService,
  ) {}

  /**
   *
   * @param settings
   * @param token
   * @description
   * @introduced 17.02.2021
   * @edited 18.02.2021
   */

  async handlePrivateCreate(
    settings: IPrivateChat,
    token: string,
  ): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(
      token,
    );
    if (payload instanceof HttpException) return payload;
    const user: DBResponse<User> = await this.userRepository.findOne({
      uuid: payload.user,
    });
    if (!user) return new NotFoundException('User Not Found');
    const participant: DBResponse<User> = await this.userRepository.findOne({
      uuid: settings.user,
    });
    if (!participant) throw new NotFoundException('Participant Not Found');

    /*  const chat: Array<User> = await this.userRepository.find({
      relations: ['chats'],
    });
    const relations: Array<Chat> = await this.chatRepository.find({
      relations: ['members'],
    });

    const members: Array<ChatMember> = await this.chatMemberRepository.find({
      relations: ['chat', 'user'],
    });
    console.log(members); */
    // chat.forEach((user) => console.log(user.chats));

    const chat: Chat = new Chat();

    chat.type = IChatType.PRIVATE;
    chat.members = [user, participant];
    await this.chatRepository.save(chat);
    // console.log(await this.chatMemberRepository.find({ relations: ['user'] }));
  }

  async handleGroupCreate(
    settings: IGroupChat,
    token: string,
  ): Promise<HandleService<void>> {}

  async handleEdit(): Promise<HandleService<void>> {}

  async handleJoin(): Promise<HandleService<void>> {}

  async handleLeave(): Promise<HandleService<void>> {}

  async handleDelete(): Promise<HandleService<void>> {}

  async handleBan(): Promise<HandleService<void>> {}

  async handleKick(): Promise<HandleService<void>> {}

  async handleGet(): Promise<HandleService<void>> {}
}
