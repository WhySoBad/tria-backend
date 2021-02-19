import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminPermission } from '../../entities/AdminPermission.entity';
import { BannedMember } from '../../entities/BannedMember.entity';
import { Chat } from '../../entities/Chat.entity';
import { ChatAdmin } from '../../entities/ChatAdmin.entity';
import { ChatMember } from '../../entities/ChatMember.entity';
import { User } from '../../entities/User.entity';
import { DBResponse, HandleService } from '../../util/Types.type';
import { TokenPayload } from '../Auth/Auth.interface';
import { AuthService } from '../Auth/Auth.service';
import {
  IAdminPermission,
  IChatEdit,
  IChatRole,
  IChatType,
  IGroupChat,
  IPrivateChat,
  IUserEdit,
} from './Chat.interface';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat) private chatRepository: Repository<Chat>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(ChatMember) private chatMemberRepository: Repository<ChatMember>,
    @InjectRepository(BannedMember) private bannedMemberRepository: Repository<BannedMember>,
    @InjectRepository(ChatAdmin) private chatAdminRepository: Repository<ChatAdmin>,
    @InjectRepository(AdminPermission)
    private adminPermissionRepository: Repository<AdminPermission>,
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

    chat.type = IChatType[settings.type];
    chat.members = participants;
    chat.name = settings.name;
    chat.tag = settings.tag;
    chat.description = settings.description;
    await this.chatRepository.save(chat);
    await this.chatMemberRepository.save(participants);
  }

  /**
   * @param chatUuid chat uuid
   * @param settings
   * @param token user auth token
   * @description
   * @introduced 19.02.2021
   * @edited 19.02.2021
   */

  async handleEdit(
    chatUuid: string,
    settings: IChatEdit,
    token: string
  ): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;

    const chat: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('chat.admins', 'admins')
      .leftJoinAndSelect('admins.permissions', 'permissions')
      .getOne();

    if (!chat) return new NotFoundException('Group Not Found');
    if (chat.type == IChatType.PRIVATE) {
      return new BadRequestException('Chat Has To Be Group');
    }

    const existing: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder()
      .where('LOWER(tag) = LOWER(:tag)', { tag: settings.tag })
      .getOne();

    if (existing) return new BadRequestException('Group Tag Has To Be Unique');

    const user: DBResponse<ChatMember> = chat.members.find((member: ChatMember) => {
      return member.userUuid == payload.user;
    });
    if (!user) return new NotFoundException('User Not Found');
    if (user.role == IChatRole.MEMBER) return new UnauthorizedException('Lacking Permissions');
    if (user.role == IChatRole.ADMIN) {
      const admin: DBResponse<ChatAdmin> = chat.admins.find((admin: ChatAdmin) => {
        return admin.userUuid == user.userUuid;
      });
      if (!admin) return new NotFoundException('Admin Not Found');
      if (!admin.permissions.find((p: AdminPermission) => p.permission == IAdminPermission.EDIT)) {
        return new UnauthorizedException('Lacking Permissions');
      }
    }

    await this.chatRepository.save({
      ...chat,
      tag: settings.tag || chat.tag,
      name: settings.name || chat.name,
      description: settings.description || chat.description,
      type: (settings.type && IChatType[settings.type]) || chat.type,
    });
  }

  /**
   * @param chatUuid chat uuid
   * @param token user auth token
   * @description
   * @introduced 18.02.2021
   * @edited 19.02.2021
   */

  async handleJoin(chatUuid: string, token: string): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;

    const chat: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('chat.banned', 'banned')
      .getOne();

    if (!chat) return new NotFoundException('Group Not Found');
    if (chat.type == IChatType.PRIVATE) {
      return new BadRequestException('Chat Has To Be Group');
    }

    const banned: DBResponse<BannedMember> = chat.banned.find((member: BannedMember) => {
      return member.userUuid == payload.user;
    });
    if (banned) return new ForbiddenException('User Is Banned');

    const exists: DBResponse<ChatMember> = chat.members.find((member: ChatMember) => {
      return member.userUuid == payload.user;
    });
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
   * @param chatUuid chat uuid
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
    if (chat.type == IChatType.PRIVATE) {
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
   * @param chatUuid chat uuid
   * @param token user auth token
   * @description
   * @introduced 18.02.2021
   * @edited 19.02.2021
   */

  async handleDelete(chatUuid: string, token: string): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;

    const chat: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .getOne();

    if (!chat) return new NotFoundException('Chat Not Found');

    const user: DBResponse<ChatMember> = chat.members.find(
      (member: ChatMember) => member.userUuid == payload.user
    );
    if (!user) return new NotFoundException('User Not Found');

    if (chat.type != IChatType.PRIVATE && user.role != IChatRole.OWNER) {
      return new UnauthorizedException('Only Owner Can Delete A Group');
    }

    await this.chatRepository.remove(chat);
  }

  /**
   * @param chatUuid chat uuid
   * @param uuid
   * @param token user auth token
   * @description
   * @introduced 19.02.2021
   * @edited 19.02.2021
   */

  async handleBan(chatUuid: string, uuid: string, token: string): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;

    const chat: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('chat.banned', 'banned')
      .leftJoinAndSelect('chat.admins', 'admins')
      .leftJoinAndSelect('admins.permission', 'permission')
      .getOne();

    if (!chat) return new NotFoundException('Chat Not Found');
    if (chat.type == IChatType.PRIVATE) return new BadRequestException('Chat Has To Be Group');

    const existing: DBResponse<BannedMember> = await this.bannedMemberRepository.findOne({
      userUuid: uuid,
      chatUuid: chatUuid,
    });
    if (existing) return new BadRequestException('User Is Already Banned');

    const user: DBResponse<ChatMember> = chat.members.find((member: ChatMember) => {
      return member.userUuid == payload.user;
    });
    if (!user) return new NotFoundException('User Not Found');
    if (user.role == IChatRole.MEMBER) return new UnauthorizedException('Lacking Permissions');

    if (user.role == IChatRole.ADMIN) {
      const admin: DBResponse<ChatAdmin> = chat.admins.find((admin: ChatAdmin) => {
        return admin.userUuid == user.userUuid;
      });
      if (!admin) return new NotFoundException('Admin Not Found');
      if (!admin.permissions.find(({ permission }) => permission == IAdminPermission.BAN)) {
        return new UnauthorizedException('Lacking Permissions');
      }
    }

    const member: DBResponse<ChatMember> = chat.members.find((member: ChatMember) => {
      return member.userUuid == uuid;
    });
    if (!member) return new NotFoundException('User Not Found');
    if (member.role == IChatRole.OWNER) return new UnauthorizedException("Owner Can't Be Banned");

    const banned: BannedMember = new BannedMember();
    banned.chat = chat;
    banned.chatUuid = chat.uuid;
    banned.user = member.user;
    banned.userUuid = member.userUuid;

    await this.bannedMemberRepository.save(banned);
    await this.chatMemberRepository.remove(member);
  }

  /**
   * @param chatUuid chat uuid
   * @param uuid
   * @param token user auth token
   * @description
   * @introduced 19.02.2021
   * @edited 19.02.2021
   */

  async handleUnban(chatUuid: string, uuid: string, token: string): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;

    const chat: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('chat.banned', 'banned')
      .leftJoinAndSelect('chat.admins', 'admins')
      .leftJoinAndSelect('admins.permission', 'permission')
      .getOne();

    if (!chat) return new NotFoundException('Chat Not Found');
    if (chat.type == IChatType.PRIVATE) return new BadRequestException('Chat Has To Be Group');

    const existing: DBResponse<BannedMember> = await this.bannedMemberRepository.findOne({
      userUuid: uuid,
      chatUuid: chatUuid,
    });
    if (!existing) return new NotFoundException("User Isn't Banned");

    const user: DBResponse<ChatMember> = chat.members.find((member: ChatMember) => {
      return member.userUuid == payload.user;
    });
    if (!user) return new NotFoundException('User Not Found');
    if (user.role == IChatRole.MEMBER) return new UnauthorizedException('Lacking Permissions');

    if (user.role == IChatRole.ADMIN) {
      const admin: DBResponse<ChatAdmin> = chat.admins.find((admin: ChatAdmin) => {
        return admin.userUuid == user.userUuid;
      });
      if (!admin) return new NotFoundException('Admin Not Found');
      if (!admin.permissions.find(({ permission }) => permission == IAdminPermission.UNBAN)) {
        return new UnauthorizedException('Lacking Permissions');
      }
    }
    const member: DBResponse<BannedMember> = chat.banned.find((member: BannedMember) => {
      return member.userUuid == uuid;
    });
    if (!member) return new NotFoundException('User Not Found');

    await this.bannedMemberRepository.remove(member);
  }

  /**
   * @param chatUuid chat uuid
   * @param uuid
   * @param token user auth token
   * @description
   * @introduced 19.02.2021
   * @edited 19.02.2021
   */

  async handleKick(chatUuid: string, uuid: string, token: string): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;

    const chat: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('chat.admins', 'admins')
      .leftJoinAndSelect('admins.permissions', 'permission')
      .getOne();

    if (!chat) return new NotFoundException('Chat Not Found');
    if (chat.type == IChatType.PRIVATE) return new BadRequestException('Chat Has To Be Group');

    const user: DBResponse<ChatMember> = chat.members.find((member: ChatMember) => {
      return member.userUuid == payload.user;
    });
    if (!user) return new NotFoundException('User Not Found');
    if (user.role == IChatRole.MEMBER) return new UnauthorizedException('Lacking Permissions');
    if (user.role == IChatRole.ADMIN) {
      const admin: DBResponse<ChatAdmin> = chat.admins.find((admin: ChatAdmin) => {
        return admin.userUuid == user.userUuid;
      });
      if (!admin) return new NotFoundException('Admin Not Found');
      if (!admin.permissions.find(({ permission }) => permission == IAdminPermission.KICK)) {
        return new UnauthorizedException('Lacking Permissions');
      }
    }

    const member: DBResponse<ChatMember> = chat.members.find((member: ChatMember) => {
      return member.userUuid == uuid;
    });
    if (!member) return new NotFoundException('User Not Found');
    if (member.role == IChatRole.OWNER) return new UnauthorizedException("Owner Can't Be Kicked");

    await this.chatMemberRepository.remove(member);
  }

  /**
   *
   * @param chatUuid chat uuid
   * @param settings 
   * @param token user auth token
   * @description
   * @introduced 18.02.2021
   * @edited 19.02.2021
   */

  async handleUserEdit(
    chatUuid: string,
    settings: IUserEdit,
    token: string
  ): Promise<HandleService<void>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;

    const chat: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .leftJoinAndSelect('chat.banned', 'banned')
      .leftJoinAndSelect('chat.admins', 'admins')
      .leftJoinAndSelect('admins.permissions', 'permissions')
      .getOne();

    if (!chat) return new NotFoundException('Chat Not Found');
    if (chat.type == IChatType.PRIVATE) return new BadRequestException('Chat Has To Be Group');

    const user: DBResponse<ChatMember> = chat.members.find((member: ChatMember) => {
      return member.userUuid == payload.user;
    });
    if (!user) return new NotFoundException('User Not Found');
    if (user.role == IChatRole.MEMBER) {
      return new UnauthorizedException('Lacking Permissions');
    }

    const member: DBResponse<ChatMember> = chat.members.find((member: ChatMember) => {
      return member.userUuid == settings.user;
    });
    if (!member) return new NotFoundException('User Not Found');
    if (member.role == IChatRole.OWNER) return new BadRequestException("Owner Can't Be Edited");

    if (user.role === IChatRole.ADMIN) {
      const admin: DBResponse<ChatAdmin> = chat.admins.find((admin: ChatAdmin) => {
        return admin.userUuid == payload.user;
      });
      if (!admin) return new NotFoundException('Admin Not Found');
      const canEdit: DBResponse<any> = admin.permissions.find((permission: AdminPermission) => {
        return permission.permission == IAdminPermission.USERS;
      });
      if (!canEdit) return new UnauthorizedException('Lacking Permissions');
      if (settings.role == IChatRole.OWNER) {
        return new UnauthorizedException("Admin Can't Change Owner");
      }
    }

    if (settings.role === IChatRole.OWNER) {
      await this.chatMemberRepository.save({ ...user, role: IChatRole.MEMBER });
      await this.chatMemberRepository.save({ ...member, role: IChatRole.OWNER });
    }

    if (settings.role === IChatRole.ADMIN) {
      if (member.role === IChatRole.ADMIN) {
        const admin: DBResponse<ChatAdmin> = chat.admins.find((admin: ChatAdmin) => {
          return admin.userUuid == settings.user;
        });
        if (!admin) {
          await this.chatMemberRepository.save({ ...member, role: IChatRole.MEMBER });
          return new NotFoundException('Admin Not Found');
        }
        await this.chatAdminRepository.save({
          ...admin,
          permissions: [
            ...(await Promise.all(
              settings.permissions.map(async (perm: IAdminPermission) => {
                const permission: AdminPermission = new AdminPermission();
                permission.permission = IAdminPermission[perm] as any;
                await this.adminPermissionRepository.save(permission);
                return permission;
              })
            )),
          ],
        });
      } else {
        const admin: ChatAdmin = new ChatAdmin();
        admin.chat = chat;
        admin.user = member.user;
        admin.permissions = [
          ...settings.permissions.map((perm: IAdminPermission) => {
            const permission: AdminPermission = new AdminPermission();
            permission.permission = perm;
            return permission;
          }),
        ];
        await this.chatMemberRepository.save({ ...member, role: IChatRole.ADMIN });
        await this.chatAdminRepository.save(admin);
      }
    }

    if (settings.role === IChatRole.MEMBER) {
      if (member.role === IChatRole.MEMBER) return;
      const admin: DBResponse<ChatAdmin> = chat.admins.find((admin: ChatAdmin) => {
        return admin.userUuid == settings.user;
      });
      if (!admin) return new NotFoundException('Admin Not Found');
      await this.chatAdminRepository.remove(admin);
      await this.chatMemberRepository.save({ ...member, role: IChatRole.MEMBER });
    }
  }

  /**
   * @param chatUuid chat uuid
   * @param token user auth token
   * @description
   * @introduced 18.02.2021
   * @edited 19.02.2021
   */

  async handleGet(chatUuid: string, token: string): Promise<HandleService<Chat>> {
    const payload: HandleService<TokenPayload> = await this.authService.verifyToken(token);
    if (payload instanceof HttpException) return payload;
    const user: DBResponse<User> = await this.userRepository.findOne({
      uuid: payload.user,
    });
    if (!user) return new NotFoundException('User Not Found');
    const chat: DBResponse<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('members.user', 'member_user')
      .leftJoinAndSelect('chat.messages', 'messages')
      .leftJoinAndSelect('chat.banned', 'banned')
      .leftJoinAndSelect('banned.user', 'banned_user')
      .leftJoinAndSelect('chat.admins', 'admins')
      .leftJoinAndSelect('admins.permissions', 'permissions')
      .getOne();

    if (!chat) return new NotFoundException('Chat Not Found');
    if (chat.type == IChatType.PRIVATE) {
      const member: DBResponse<ChatMember> = chat.members.find((member: ChatMember) => {
        member.userUuid == user.uuid;
      });
      if (!member) return new BadRequestException('User Has To Be Member Of Private Chat');
    }
    return chat;
  }
}
