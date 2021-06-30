import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Chat } from '../../entities/Chat.entity';
import { User } from '../../entities/User.entity';
import { SearchDto } from '../../pipes/validation/SearchDto.dto';
import { TokenPayload } from '../Auth/Jwt/Jwt.interface';
import { ChatPreview, ChatType } from '../Chat/Chat.interface';
import { UserPreview } from '../User/User.interface';
import { WeightedEntry } from './Search.interface';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Chat) private chatRepository: Repository<Chat>
  ) {}

  /**
   * Function to search recommended chats and users
   *
   * @param payload token payload
   *
   * @param body search options
   *
   * @returns Promise<Array<ChatPreview | UserPreview>>
   */

  async handleSearch(
    payload: TokenPayload,
    body: SearchDto
  ): Promise<Array<ChatPreview | UserPreview>> {
    const checkUuid: boolean = !!body.checkUuid;
    const checkTag: boolean = !!body.checkTag;
    const checkName: boolean = !!body.checkName || (!body.checkUuid && !body.checkTag);
    const checkUser: boolean = !!body.checkUser;
    const checkChat: boolean = !!body.checkChat || !checkUser;
    const text: string = body.text.toLowerCase();

    const getUser = async (): Promise<Array<User>> => {
      if (!checkUser) return [];
      const builder: SelectQueryBuilder<User> = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.chats', 'chatmember')
        .leftJoinAndSelect('chatmember.chat', 'chat')
        .leftJoinAndSelect('chat.members', 'member')
        .leftJoinAndSelect('chat.banned', 'banned')
        .leftJoinAndSelect('banned.user', 'banned_user');
      const user: Array<User> = [
        ...(checkUuid ? await builder.orWhere(`LOWER(user.uuid) like '%${text}%'`).getMany() : []),
        ...(checkName ? await builder.orWhere(`LOWER(user.name) like '%${text}%'`).getMany() : []),
        ...(checkTag ? await builder.orWhere(`LOWER(user.tag) like '%${text}%'`).getMany() : []),
      ];
      return [...new Set(user)];
    };

    const getChats = async (): Promise<Array<Chat>> => {
      if (!checkChat) return [];

      const builder: SelectQueryBuilder<Chat> = this.chatRepository
        .createQueryBuilder('chat')
        .leftJoinAndSelect('chat.members', 'member')
        .leftJoinAndSelect('member.user', 'user')
        .leftJoinAndSelect('chat.banned', 'banned')
        .leftJoinAndSelect('banned.user', 'banned_user')
        .where('chat.type = 0');
      const chats: Array<Chat> = [
        ...(checkUuid ? await builder.andWhere(`LOWER(chat.uuid) like '%${text}%'`).getMany() : []),
        ...(checkName ? await builder.andWhere(`LOWER(chat.name) like '%${text}%'`).getMany() : []),
        ...(checkTag ? await builder.andWhere(`LOWER(chat.tag) like '%${text}%'`).getMany() : []),
      ];

      return [
        ...new Set(
          chats.filter(
            (chat: Chat) => !chat.banned.find(({ userUuid }) => payload.user === userUuid)
          )
        ),
      ];
    };

    const user: User | undefined = await this.userRepository
      .createQueryBuilder('user')
      .where('user.uuid = :uuid', { uuid: payload.user })
      .leftJoinAndSelect('user.chats', 'chatmember')
      .leftJoinAndSelect('chatmember.chat', 'chat')
      .leftJoinAndSelect('chat.members', 'member')
      .getOne();

    if (!user) throw new NotFoundException('User Not Found');

    const mappedChats: Array<string> = user.chats.map(({ chatUuid }) => chatUuid.toLowerCase());

    const chats: Array<WeightedEntry<ChatPreview>> = (await getChats()).map((chat: Chat) => {
      const { uuid, type, name, tag, description, members } = chat;
      const weighted: WeightedEntry<ChatPreview> = {
        uuid: uuid,
        type: (ChatType as any)[type],
        name: name,
        tag: tag,
        description: description,
        weight: 0,
        startsWith: false,
        characters: 0,
        size: members.length,
        online: members.filter(({ user: { online } }) => online).length,
      };

      if (checkUuid && user.uuid.toLowerCase().startsWith(text)) {
        weighted.startsWith = true;
        weighted.characters = (text.length / user.uuid.length) * 100;
      }
      if (checkName && user.name.toLowerCase().startsWith(text)) {
        weighted.startsWith = true;
        const percentage: number = (text.length / user.name.length) * 100;
        percentage > weighted.characters && (weighted.characters = percentage);
      }
      if (checkTag && user.tag.toLowerCase().startsWith(text)) {
        weighted.startsWith = true;
        const percentage: number = (text.length / user.tag.length) * 100;
        percentage > weighted.characters && (weighted.characters = percentage);
      }

      //amount of users the user is already in a chat with
      //one user can count multiple times when they are in different chats together
      const sameContacts: number = chat.members
        .map(({ userUuid }) => userUuid.toLowerCase())
        .filter((uuid) => {
          let found: number = 0;
          user.chats.forEach(({ chat: { members } }) => {
            if (members.find(({ userUuid }) => userUuid.toLowerCase() === uuid)) found++;
          });
          return found;
        }).length;

      //percentage of current online people in the chat to make sure that active chats get more promoted
      const percentageOnline: number = (weighted.online / weighted.size) * 100;
      weighted.weight = percentageOnline + sameContacts;
      return weighted;
    });

    const users: Array<WeightedEntry<UserPreview>> = (await getUser()).map((user: User) => {
      const { uuid, name, tag, description } = user;
      const weighted: WeightedEntry<UserPreview> = {
        uuid: uuid,
        name: name,
        tag: tag,
        description: description,
        weight: 0,
        startsWith: false,
        characters: 0,
      };
      if (checkUuid && user.uuid.toLowerCase().startsWith(text)) {
        weighted.startsWith = true;
        weighted.characters = (text.length / user.uuid.length) * 100;
      }
      if (checkName && user.name.toLowerCase().startsWith(text)) {
        weighted.startsWith = true;
        const percentage: number = (text.length / user.name.length) * 100;
        percentage > weighted.characters && (weighted.characters = percentage);
      }
      if (checkTag && user.tag.toLowerCase().startsWith(text)) {
        weighted.startsWith = true;
        const percentage: number = (text.length / user.tag.length) * 100;
        percentage > weighted.characters && (weighted.characters = percentage);
      }

      //amount of shared chats with the user
      const sameChats: number = user.chats
        .filter(({ chat }) => !chat.banned.find(({ userUuid }) => payload.user === userUuid))
        .map(({ chatUuid }) => chatUuid.toLowerCase())
        .filter((uuid) => mappedChats.includes(uuid)).length;

      weighted.weight = sameChats + weighted.characters;
      return weighted;
    });

    const mixed: Array<WeightedEntry<UserPreview> | WeightedEntry<ChatPreview>> = [
      ...users,
      ...chats,
    ].sort((a, b) => {
      if (a.startsWith && !b.startsWith) return -1;
      else if (b.startsWith && !a.startsWith) return 1;
      if (!(a.characters === 100 && b.characters === 100)) {
        if (a.characters === 100) return -1;
        else if (b.characters === 100) return 1;
      }
      return a.weight - b.weight;
    });

    return [
      ...mixed.map((value) => {
        const { weight, characters, startsWith, ...rest } = value;
        return rest;
      }),
    ];
  }
}
