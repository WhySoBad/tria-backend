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
import { IChatRole, IChatType, IGroupChat, IPrivateChat } from './Chat.interface';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat) private chatRepository: Repository<Chat>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(ChatMember)
    private chatMemberRepository: Repository<ChatMember>,
    private authService: AuthService
  ) {}

  /**
   * @param settings settings of  type IPrivateChat
   * @param token user auth token
   * @description
   * @returns Promise<HandleService<void>>
   * @introduced 18.02.2021
   * @edited 18.02.2021
   */

  async handlePrivateCreate(settings: IPrivateChat, token: string): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;
    const user: DBResponse<User> = await this.userRepository.findOne({
      uuid: payload.user,
    });
    if (!user) return new NotFoundException('User Not Found');
    const participant: DBResponse<User> = await this.userRepository.findOne({
      uuid: settings.user,
    });
    if (!participant) return new NotFoundException('Participant Not Found');

    const chats: Array<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.type = :chatType', { chatType: IChatType.PRIVATE })
      .leftJoinAndSelect('chat.members', 'members')
      .getMany();

    const existing: Array<Chat> = chats.filter((chat: Chat) => {
      if (chat.members.length == 2) {
        const members: Array<ChatMember> = chat.members;
        const uuids: Array<string> = [user.uuid, participant.uuid];
        const filter: Array<ChatMember> = members.filter((m: ChatMember) =>
          uuids.includes(m.userUuid)
        );
        if (filter.length == 2) return chat;
      }
      return;
    });

    if (existing.length != 0) {
      return new BadRequestException('Private Chat Already Exists');
    }

    const chat: Chat = new Chat();
    const participants: Array<ChatMember> = [];
    participants[0] = new ChatMember();
    participants[0].user = user;
    participants[0].chat = chat;
    participants[1] = new ChatMember();
    participants[1].user = participant;
    participants[1].chat = chat;

    chat.type = IChatType.PRIVATE;
    chat.members = participants;
    await this.chatRepository.save(chat);
    await this.chatMemberRepository.save(participants);
  }

  /**
   * @param settings settings of  type IGroupChat
   * @param token user auth token
   * @description
   * @returns Promise<HandleService<void>>
   * @introduced 18.02.2021
   * @edited 18.02.2021
   */

  async handleGroupCreate(settings: IGroupChat, token: string): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;
    const user: DBResponse<User> = await this.userRepository.findOne({
      uuid: payload.user,
    });
    if (!user) return new NotFoundException('User Not Found');

    const users: Array<User> = [];
    for (const uuid of settings.members) {
      const user: DBResponse<User> = await this.userRepository.findOne({
        uuid: uuid,
      });
      if (user) users.push(user);
    }

    const existing: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder()
      .where('LOWER(tag) = LOWER(:tag)', { tag: settings.tag })
      .getOne();

    if (existing) return new BadRequestException('Group Tag Has To Be Unique');

    const chat: Chat = new Chat();
    console.log(users);
    const participants: Array<ChatMember> = users.map((user: User) => {
      const participant: ChatMember = new ChatMember();
      participant.user = user;
      participant.chat = chat;
      return participant;
    });

    const owner: ChatMember = new ChatMember();
    owner.user = user;
    owner.chat = chat;
    owner.role = IChatRole.OWNER;

    chat.type = IChatType.GROUP;
    chat.members = participants;
    chat.name = settings.name;
    chat.tag = settings.tag;
    chat.description = settings.description;
    await this.chatRepository.save(chat);
    await this.chatMemberRepository.save(participants);
  }

  async handleEdit(): Promise<HandleService<void>> {}

  /**
   * @param chatUuid
   * @param token user auth token
   * @description
   * @introduced 18.02.2021
   * @edited 18.02.2021
   */

  async handleJoin(chatUuid: string, token: string): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;

    const chat: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .getOne();

    if (!chat) return new NotFoundException('Group Not Found');
    if (chat.type != IChatType.GROUP) {
      return new BadRequestException('Chat Has To Be Group');
    }

    const exists: DBResponse<ChatMember> = chat.members.find(
      (member: ChatMember) => member.userUuid == payload.user
    );
    if (exists) return new BadRequestException('User Is Already Joined');

    const user: DBResponse<User> = await this.userRepository.findOne({
      uuid: payload.user,
    });
    if (!user) return new NotFoundException('User Not Found');

    const member: ChatMember = new ChatMember();
    member.chat = chat;
    member.user = user;
    this.chatMemberRepository.save(member);
  }

  /**
   * @param chatUuid
   * @param token user auth token
   * @description
   * @introduced 18.02.2021
   * @edited 18.02.2021
   */

  async handleLeave(chatUuid: string, token: string): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;

    const chat: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .getOne();

    if (!chat) return new NotFoundException('Group Not Found');
    if (chat.type != IChatType.GROUP) {
      return new BadRequestException('Chat Has To Be Group');
    }

    const user: DBResponse<ChatMember> = chat.members.find(
      (member: ChatMember) => member.userUuid == payload.user
    );
    if (!user) return new NotFoundException('User Not Found');

    if (user.role == IChatRole.OWNER) {
      return new BadRequestException("Owner Can't Leave The Group");
    }

    await this.chatMemberRepository.remove(user);
  }

  /**
   * @param chatUuid
   * @param token user auth token
   * @description
   * @introduced 18.02.2021
   * @edited 18.02.2021
   */

  async handleDelete(chatUuid: string, token: string): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;

    const chat: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .getOne();

    if (!chat) return new NotFoundException('Group Not Found');

    const user: DBResponse<ChatMember> = chat.members.find(
      (member: ChatMember) => member.userUuid == payload.user
    );
    if (!user) return new NotFoundException('User Not Found');

    if (chat.type == IChatType.GROUP && user.role != IChatRole.OWNER) {
      return new UnauthorizedException('Only Owner Can Delete A Group');
    }

    await this.chatRepository.remove(chat);
  }

  async handleBan(): Promise<HandleService<void>> {}

  async handleKick(): Promise<HandleService<void>> {}

  /**
   *
   * @param chatUuid
   * @param uuid
   * @param token user auth token
   * @description
   * @introduced 18.02.2021
   * @edited 18.02.2021
   */

  async handlePromote(chatUuid: string, uuid: string, token: string): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;
    const sender: DBResponse<User> = await this.userRepository.findOne({
      uuid: payload.user,
    });
    if (!sender) return new NotFoundException('User Not Found');
  }

  /**
   *
   * @param chatUuid chat uuid
   * @param uuid uuid of the user to be demoted
   * @param token user auth token
   * @description
   * @introduced 18.02.2021
   * @edited 18.02.2021
   */

  async handleDeomote(chatUuid: string, uuid: string, token: string): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;

    const sender: DBResponse<User> = await this.userRepository.findOne({
      uuid: payload.user,
    });
    if (!sender) return new NotFoundException('User Not Found');

    const chat: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .getOne();
    if (!chat) return new NotFoundException('Group Not Found');
    if (chat.type == IChatType.PRIVATE) {
      return new BadRequestException('Chat Has To Be Group');
    }

    const user: DBResponse<ChatMember> = chat.members.find((member: ChatMember) => {
      member.user.uuid == uuid;
    });
    if (!user) return new NotFoundException('User Not Found');
  }

  /**
   * @param uuid
   * @param token user auth token
   * @description
   * @introduced 18.02.2021
   * @edited 18.02.2021
   */

  async handleGet(uuid: string, token: string): Promise<HandleService<Chat>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;
    const user: DBResponse<User> = await this.userRepository.findOne({
      uuid: payload.user,
    });
    if (!user) return new NotFoundException('User Not Found');
    const chat: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: uuid })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .getOne();
    if (!chat) return new NotFoundException('Chat Not Found');
    return chat;
  }
}
