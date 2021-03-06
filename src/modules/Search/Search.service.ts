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

    /**
     * Function to generate the SQL query for a given param
     *
     * @param builder current query builder
     *
     * @param param parameter
     *
     * @returns Promise<Array<any>>
     */

    const getQuery: (
      builder: SelectQueryBuilder<any>,
      param: string
    ) => Promise<Array<any>> = async (builder: SelectQueryBuilder<any>, param: string) => {
      const query: string = `LOWER(${param}) like '%${text}%'`;
      return await builder.andWhere(query).getMany();
    };

    /**
     * Function to get the user which match the current
     *
     * search options
     *
     * @returns Promise<Array<User>>
     */

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
        ...(checkUuid ? await getQuery(builder, 'user.uuid') : []),
        ...(checkName ? await getQuery(builder, 'user.name') : []),
        ...(checkTag ? await getQuery(builder, 'user.tag') : []),
      ].filter(({ uuid }) => uuid !== payload.user);
      return user.filter((a, i) => user.findIndex((b) => a.uuid === b.uuid) === i);
    };

    /**
     * Function to get the chats which match the
     *
     * current search options
     *
     * @returns Promise<Array<Chat>>
     */

    const getChats = async (): Promise<Array<Chat>> => {
      if (!checkChat) return [];

      const builder: SelectQueryBuilder<Chat> = this.chatRepository
        .createQueryBuilder('chat')
        .leftJoinAndSelect('chat.members', 'member')
        .leftJoinAndSelect('member.user', 'user')
        .leftJoinAndSelect('chat.banned', 'banned')
        .leftJoinAndSelect('banned.user', 'banned_user')
        .andWhere('chat.type = 0');
      const chats: Array<Chat> = [
        ...(checkUuid ? await getQuery(builder, 'chat.uuid') : []),
        ...(checkName ? await getQuery(builder, 'chat.name') : []),
        ...(checkTag ? await getQuery(builder, 'chat.tag') : []),
      ].filter((chat: Chat) => !chat.banned.find(({ userUuid }) => payload.user === userUuid));

      return chats.filter((a, i) => chats.findIndex((b) => a.uuid === b.uuid) === i);
    };

    /**
     * Function to calculate the weight
     *
     * @param name name of the result
     *
     * @param tag tag of the result
     *
     * @param uuid uuid of the result
     *
     * @returns number
     */

    const getWeight = (name: string, tag: string, uuid: string): number => {
      let weight: number = 0;
      if (text.length !== 0) {
        const nameStarts: boolean = name.toLowerCase().startsWith(text);
        const replacedName: number = text.length - name.toLowerCase().replace(text, '').length;
        if (nameStarts) weight += 10;
        weight += (replacedName / text.length) * 40; //matching name gives 40 weight

        const tagStarts: boolean = tag.toLowerCase().startsWith(text);
        const replacedTag: number = text.length - tag.toLowerCase().replace(text, '').length;
        if (tagStarts) weight += 10;
        weight += (replacedTag / text.length) * 25; //matching tag gives 25 weight

        const uuidStarts: boolean = uuid.toLowerCase().startsWith(text);
        const replacedUuid: number = text.length - uuid.toLowerCase().replace(text, '').length;
        if (uuidStarts) weight += 10;
        weight += (replacedUuid / text.length) * 15; //matching uuid gives 15 weight
      }
      return weight;
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
      let weight: number = 0;
      const weighted: WeightedEntry<ChatPreview> = {
        uuid: uuid,
        type: (ChatType as any)[type],
        name: name,
        tag: tag,
        description: description,
        size: members.length,
        online: members.filter(({ user: { online } }) => online).length,
        avatar: chat.avatar,
        weight: 0,
      };

      if (!name || !tag) return weighted;

      //amount of users the user is already in a chat with
      //one user can count multiple times when they are in different chats together

      const contacts: number = chat.members
        .map(({ userUuid }) => userUuid.toLowerCase())
        .filter((uuid) => {
          let found: number = 0;
          user.chats.forEach(({ chat: { members } }) => {
            if (members.find(({ userUuid }) => userUuid.toLowerCase() === uuid)) found++;
          });
          return found;
        }).length;

      weight += contacts > 20 ? 8 : contacts * 0.4; //maximum of 8 points for shared contacts

      const online: number = weighted.online / weighted.size;

      weight += (!isNaN(online) && online * 2) || 0; //percentage of online users gives 2 points
      weight += getWeight(name, tag, uuid);
      weighted.weight = weight;
      return weighted;
    });

    const users: Array<WeightedEntry<UserPreview>> = (await getUser()).map((user: User) => {
      const { uuid, name, tag, description, avatar } = user;
      let weight: number = 0;
      const weighted: WeightedEntry<UserPreview> = {
        uuid: uuid,
        name: name,
        tag: tag,
        description: description,
        avatar: avatar,
        weight: 0,
      };

      //amount of shared chats
      const chats: number = user.chats
        .filter(({ chat }) => !chat.banned.find(({ userUuid }) => payload.user === userUuid))
        .map(({ chatUuid }) => chatUuid.toLowerCase())
        .filter((uuid) => mappedChats.includes(uuid)).length;

      weight += chats > 10 ? 10 : chats; //maximum of 10 points for shared chats
      weight += getWeight(name, tag, uuid);
      weighted.weight = weight;
      return weighted;
    });

    const mixed: Array<WeightedEntry<UserPreview> | WeightedEntry<ChatPreview>> = [
      ...users,
      ...chats,
    ].sort((a, b) => {
      return b.weight - a.weight;
    });

    return [
      ...mixed.map((value) => {
        const { weight, ...rest } = value;
        return rest;
      }),
    ];
  }
}
