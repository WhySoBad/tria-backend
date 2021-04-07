import {
  BadRequestException,
  ForbiddenException,
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
import { Message } from '../../entities/Message.entity';
import { User } from '../../entities/User.entity';
import { ChatEditDto } from '../../pipes/validation/ChatEditDto.dto';
import { GroupChatDto } from '../../pipes/validation/GroupChatDto.dto';
import { MemberEditDto } from '../../pipes/validation/MemberEditDto.dto';
import { MessageEditDto } from '../../pipes/validation/MessageEditDto.dto';
import { TokenPayload } from '../Auth/Jwt/Jwt.interface';
import { ChatGateway } from './Chat.gateway';
import { Permission, GroupRole, ChatType } from './Chat.interface';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat) private chatRepository: Repository<Chat>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(ChatMember) private chatMemberRepository: Repository<ChatMember>,
    @InjectRepository(BannedMember) private bannedMemberRepository: Repository<BannedMember>,
    @InjectRepository(Message) private messageRepository: Repository<Message>,
    @InjectRepository(ChatAdmin) private chatAdminRepository: Repository<ChatAdmin>,
    @InjectRepository(AdminPermission)
    private adminPermissionRepository: Repository<AdminPermission>,
    private chatGateway: ChatGateway
  ) {}

  /**
   * Function to create a new private chat
   *
   * @param participantUuid uuid of the participant
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<HandleService<void>>
   */

  async handlePrivateCreate(participantUuid: string, payload: TokenPayload): Promise<void> {
    const user: User | undefined = await this.userRepository.findOne({
      uuid: payload.user,
    });
    if (!user) throw new NotFoundException('User Not Found');
    const participant: User | undefined = await this.userRepository.findOne({
      uuid: participantUuid,
    });
    if (!participant) throw new NotFoundException('Participant Not Found');

    const chats: Array<Chat> = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.type = :chatType', { chatType: ChatType.PRIVATE })
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
      throw new BadRequestException('Private Chat Already Exists');
    }

    const chat: Chat = new Chat();
    const participants: Array<ChatMember> = [];
    participants[0] = new ChatMember();
    participants[0].user = user;
    participants[0].chat = chat;
    participants[1] = new ChatMember();
    participants[1].user = participant;
    participants[1].chat = chat;

    chat.type = ChatType.PRIVATE;
    chat.members = participants;
    await this.chatRepository.save(chat);
    await this.chatMemberRepository.save(participants);
  }

  /**
   * Function to create a new group chat
   *
   * @param settings data of the group chat
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<void>
   */

  async handleGroupCreate(settings: GroupChatDto, payload: TokenPayload): Promise<void> {
    const user: User | undefined = await this.userRepository.findOne({
      uuid: payload.user,
    });
    if (!user) throw new NotFoundException('User Not Found');

    const users: Array<User> = [];
    for (const uuid of settings.members) {
      const user: User | undefined = await this.userRepository.findOne({
        uuid: uuid,
      });
      if (user) users.push(user);
    }

    const existing:
      | Chat
      | undefined = await this.chatRepository
      .createQueryBuilder()
      .where('LOWER(tag) = LOWER(:tag)', { tag: settings.tag })
      .getOne();

    if (existing) throw new BadRequestException('Group Tag Has To Be Unique');

    const chat: Chat = new Chat();
    const participants: Array<ChatMember> = users.map((user: User) => {
      const participant: ChatMember = new ChatMember();
      participant.user = user;
      participant.chat = chat;
      return participant;
    });

    const owner: ChatMember = new ChatMember();
    owner.user = user;
    owner.chat = chat;
    owner.role = GroupRole.OWNER;
    chat.type = ChatType[settings.type] as any;
    chat.members = participants;
    chat.name = settings.name;
    chat.tag = settings.tag;
    chat.description = settings.description;

    await this.chatRepository.save(chat);
    await this.chatMemberRepository.save(participants);
  }

  /**
   * Function to join a group
   *
   * @param chatUuid chat uuid
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<void>
   */

  async handleJoin(chatUuid: string, payload: TokenPayload): Promise<void> {
    const chat: Chat | undefined = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('chat.banned', 'banned')
      .getOne();

    if (!chat) throw new NotFoundException('Group Not Found');
    if (chat.type == ChatType.PRIVATE) {
      throw new BadRequestException('Chat Has To Be Group');
    }

    const banned: BannedMember | undefined = chat.banned.find((member: BannedMember) => {
      return member.userUuid == payload.user;
    });
    if (banned) throw new ForbiddenException('User Is Banned');

    const exists: ChatMember | undefined = chat.members.find((member: ChatMember) => {
      return member.userUuid == payload.user;
    });
    if (exists) throw new BadRequestException('User Is Already Joined');

    const user: User | undefined = await this.userRepository.findOne({
      uuid: payload.user,
    });
    if (!user) throw new NotFoundException('User Not Found');

    const member: ChatMember = new ChatMember();
    member.chat = chat;
    member.user = user;

    await this.chatMemberRepository.save(member);
    this.chatGateway.handleGroupUserJoin(chat.uuid, member.userUuid, payload);
  }

  /**
   * Function to leave a group
   *
   * @param chatUuid chat uuid
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<void>
   */

  async handleLeave(chatUuid: string, payload: TokenPayload): Promise<void> {
    const chat: Chat | undefined = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .getOne();

    if (!chat) throw new NotFoundException('Group Not Found');
    if (chat.type == ChatType.PRIVATE) {
      throw new BadRequestException('Chat Has To Be Group');
    }

    const user: ChatMember | undefined = chat.members.find(
      (member: ChatMember) => member.userUuid == payload.user
    );
    if (!user) throw new NotFoundException('User Not Found');

    if (user.role == GroupRole.OWNER) {
      throw new BadRequestException("Owner Can't Leave The Group");
    }

    await this.chatMemberRepository.remove(user);
    this.chatGateway.handleGroupUserLeave(chat.uuid, payload.user, payload);
  }

  /**
   * Function to delete a chat
   *
   * @param chatUuid chat uuid
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<void>
   */

  async handleDelete(chatUuid: string, payload: TokenPayload): Promise<void> {
    const chat: Chat | undefined = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .getOne();

    if (!chat) throw new NotFoundException('Chat Not Found');

    const user: ChatMember | undefined = chat.members.find(
      (member: ChatMember) => member.userUuid == payload.user
    );
    if (!user) throw new NotFoundException('User Not Found');

    if (chat.type != ChatType.PRIVATE && user.role != GroupRole.OWNER) {
      throw new UnauthorizedException('Only Owner Can Delete A Group');
    }

    await this.chatRepository.remove(chat);
    this.chatGateway.handleChatDelete(chat.uuid);
  }

  /**
   * Function to ban an user from a group
   *
   * @param chatUuid chat uuid
   *
   * @param uuid user uuid
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<void>
   */

  async handleBan(chatUuid: string, uuid: string, payload: TokenPayload): Promise<void> {
    const chat: Chat | undefined = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('chat.banned', 'banned')
      .leftJoinAndSelect('chat.admins', 'admins')
      .leftJoinAndSelect('admins.permission', 'permission')
      .getOne();

    if (!chat) throw new NotFoundException('Chat Not Found');
    if (chat.type == ChatType.PRIVATE) throw new BadRequestException('Chat Has To Be Group');

    const existing: BannedMember | undefined = await this.bannedMemberRepository.findOne({
      userUuid: uuid,
      chatUuid: chatUuid,
    });
    if (existing) throw new BadRequestException('User Is Already Banned');

    const user: ChatMember | undefined = chat.members.find((member: ChatMember) => {
      return member.userUuid == payload.user;
    });
    if (!user) throw new NotFoundException('User Not Found');
    if (user.role == GroupRole.MEMBER) throw new UnauthorizedException('Lacking Permissions');

    if (user.role == GroupRole.ADMIN) {
      const admin: ChatAdmin | undefined = chat.admins.find((admin: ChatAdmin) => {
        return admin.userUuid == user.userUuid;
      });
      if (!admin) throw new NotFoundException('Admin Not Found');
      if (!admin.permissions.find(({ permission }) => permission == Permission.BAN)) {
        throw new UnauthorizedException('Lacking Permissions');
      }
    }

    const member: ChatMember | undefined = chat.members.find((member: ChatMember) => {
      return member.userUuid == uuid;
    });
    if (!member) throw new NotFoundException('User Not Found');
    if (member.role == GroupRole.OWNER) throw new UnauthorizedException("Owner Can't Be Banned");

    const banned: BannedMember = new BannedMember();
    banned.chat = chat;
    banned.chatUuid = chat.uuid;
    banned.user = member.user;
    banned.userUuid = member.userUuid;

    await this.bannedMemberRepository.save(banned);
    await this.chatMemberRepository.remove(member);
    this.chatGateway.handleGroupUserBan(chat.uuid, member.userUuid);
  }

  /**
   * Function to unban an user from a group
   *
   * @param chatUuid chat uuid
   *
   * @param uuid user uuid
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<void>
   */

  async handleUnban(chatUuid: string, uuid: string, payload: TokenPayload): Promise<void> {
    const chat: Chat | undefined = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('chat.banned', 'banned')
      .leftJoinAndSelect('chat.admins', 'admins')
      .leftJoinAndSelect('admins.permission', 'permission')
      .getOne();

    if (!chat) throw new NotFoundException('Chat Not Found');
    if (chat.type == ChatType.PRIVATE) throw new BadRequestException('Chat Has To Be Group');

    const existing: BannedMember | undefined = await this.bannedMemberRepository.findOne({
      userUuid: uuid,
      chatUuid: chatUuid,
    });
    if (!existing) throw new NotFoundException("User Isn't Banned");

    const user: ChatMember | undefined = chat.members.find((member: ChatMember) => {
      return member.userUuid == payload.user;
    });
    if (!user) throw new NotFoundException('User Not Found');
    if (user.role == GroupRole.MEMBER) throw new UnauthorizedException('Lacking Permissions');

    if (user.role == GroupRole.ADMIN) {
      const admin: ChatAdmin | undefined = chat.admins.find((admin: ChatAdmin) => {
        return admin.userUuid == user.userUuid;
      });
      if (!admin) throw new NotFoundException('Admin Not Found');
      if (!admin.permissions.find(({ permission }) => permission == Permission.UNBAN)) {
        throw new UnauthorizedException('Lacking Permissions');
      }
    }
    const member: BannedMember | undefined = chat.banned.find((member: BannedMember) => {
      return member.userUuid == uuid;
    });
    if (!member) throw new NotFoundException('User Not Found');

    await this.bannedMemberRepository.remove(member);
  }

  /**
   * Function to kick an user from a group
   *
   * @param chatUuid chat uuid
   *
   * @param uuid user uuid
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<void>
   */

  async handleKick(chatUuid: string, uuid: string, payload: TokenPayload): Promise<void> {
    const chat: Chat | undefined = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('chat.admins', 'admins')
      .leftJoinAndSelect('admins.permissions', 'permission')
      .getOne();

    if (!chat) throw new NotFoundException('Chat Not Found');
    if (chat.type == ChatType.PRIVATE) throw new BadRequestException('Chat Has To Be Group');

    const user: ChatMember | undefined = chat.members.find((member: ChatMember) => {
      return member.userUuid == payload.user;
    });
    if (!user) throw new NotFoundException('User Not Found');
    if (user.role == GroupRole.MEMBER) throw new UnauthorizedException('Lacking Permissions');
    if (user.role == GroupRole.ADMIN) {
      const admin: ChatAdmin | undefined = chat.admins.find((admin: ChatAdmin) => {
        return admin.userUuid == user.userUuid;
      });
      if (!admin) throw new NotFoundException('Admin Not Found');
      if (!admin.permissions.find(({ permission }) => permission == Permission.KICK)) {
        throw new UnauthorizedException('Lacking Permissions');
      }
    }

    const member: ChatMember | undefined = chat.members.find((member: ChatMember) => {
      return member.userUuid == uuid;
    });
    if (!member) throw new NotFoundException('User Not Found');
    if (member.role == GroupRole.OWNER) throw new UnauthorizedException("Owner Can't Be Kicked");

    await this.chatMemberRepository.remove(member);
  }

  /**
   * Function to get a chat
   *
   * @param chatUuid chat uuid
   *
   * @returns Promise<Chat>
   */

  async handleGet(chatUuid: string): Promise<Chat> {
    const chat: Chat | undefined = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('members.user', 'member_user')
      .leftJoinAndSelect('chat.messages', 'message')
      .orderBy('message.createdAt', 'ASC')
      .leftJoinAndSelect('chat.banned', 'banned')
      .leftJoinAndSelect('banned.user', 'banned_user')
      .leftJoinAndSelect('chat.admins', 'admins')
      .leftJoinAndSelect('admins.permissions', 'permissions')
      .getOne();
    if (!chat) throw new NotFoundException('Chat Not Found');
    return chat;
  }

  /**
   * Function to create a new message
   *
   * @param chatUuid chat uuid
   *
   * @param text text of the message
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<Message>
   */

  async handleMessage(chatUuid: string, text: string, { user }: TokenPayload): Promise<Message> {
    const chat: Chat | undefined = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'member')
      .getOne();
    if (!chat) throw new NotFoundException('Chat Not Found');
    const sender: ChatMember | undefined = chat.members.find((member: ChatMember) => {
      return member.userUuid == user;
    });
    if (!sender) throw new NotFoundException('Sender Has To Be Chat Member');
    const message: Message = new Message();
    message.chatUuid = chatUuid;
    message.userUuid = sender.userUuid;
    message.text = text;
    await this.messageRepository.save(message);
    return message;
  }

  /**
   * Function to handle chat edits
   *
   * @param chatUuid chat uuid
   *
   * @param data data to be changed [name, type, description, ...]
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<Chat>
   */

  async handleChatEdit(
    chatUuid: string,
    { name, type, description, tag }: ChatEditDto,
    { user }: TokenPayload
  ): Promise<Chat> {
    const chat: Chat | undefined = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('chat.admins', 'admins')
      .leftJoinAndSelect('admins.permissions', 'permissions')
      .getOne();
    if (!chat) throw new NotFoundException('Chat Not Found');
    if (chat.type === ChatType.PRIVATE) throw new BadRequestException('Only Groups Can Be Edited');
    if (tag) {
      const group:
        | Chat
        | undefined = await this.chatRepository
        .createQueryBuilder()
        .where('LOWER(tag) = LOWER(:tag)', { tag: tag })
        .getOne();
      if (group) throw new BadRequestException('Group Tag Has To Be Unique');
    }
    const member: ChatMember | undefined = chat.members.find((member: ChatMember) => {
      return member.userUuid == user;
    });
    if (!member) throw new NotFoundException('User Not Found In Group');
    if (member.role === GroupRole.MEMBER) throw new UnauthorizedException('Lacking Permissions');
    else if (member.role === GroupRole.ADMIN) {
      const admin: ChatAdmin | undefined = chat.admins.find((admin: ChatAdmin) => {
        return admin.userUuid === member.userUuid;
      });
      if (!admin) throw new NotFoundException('Admin Not Found In Group');
      const hasPermission: boolean = !!admin.permissions.find((permission: AdminPermission) => {
        return permission.permission === Permission.EDIT;
      });
      if (!hasPermission) throw new UnauthorizedException('Lacking Permissions');
    }

    if (tag) chat.tag = tag;
    if (name) chat.name = name;
    if (description) chat.description = description;
    if (type) chat.type = ChatType[type];

    await this.chatRepository.save({
      ...chat,
    });

    return chat;
  }

  /**
   * Function to handle message edits
   *
   * @param data data to be changed [pinned, ...]
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<Message>
   */

  async handleMessageEdit(data: MessageEditDto, { user }: TokenPayload): Promise<Message> {
    const message: Message | undefined = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.uuid = :uuid', { uuid: data.message })
      .leftJoinAndSelect('message.chat', 'chat')
      .leftJoinAndSelect('chat.members', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .getOne();
    if (!message) throw new NotFoundException('Message Not Found');

    const sender: ChatMember | undefined = message.chat.members.find((member: ChatMember) => {
      return member.userUuid == user;
    });
    if (!sender) throw new NotFoundException('User Not Found');
    if (sender.userUuid !== message.userUuid) {
      throw new UnauthorizedException('You Can Only Edit Your Own Messages');
    }

    if (data.text) {
      message.text = data.text;
      message.edited += 1;
      message.editedAt = new Date();
    }
    if (data.pinned != null) message.pinned = data.pinned;

    await this.messageRepository.save(message);

    return message;
  }

  /**
   * Function to handle member edits
   *
   * @param chatUuid chat uuid
   *
   * @param data data to be changed [role, ...]
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<ChatMember | Array<ChatMember>> | ChatAdmin
   */

  async handleMemberEdit(
    chatUuid: string,
    data: MemberEditDto,
    { user }: TokenPayload
  ): Promise<ChatMember | Array<ChatMember> | ChatAdmin> {
    const roleId: number = GroupRole[data.role as any] as any;

    const chat: Chat | undefined = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: chatUuid })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .leftJoinAndSelect('chat.banned', 'banned')
      .leftJoinAndSelect('chat.admins', 'admins')
      .leftJoinAndSelect('admins.permissions', 'permissions')
      .getOne();
    if (!chat) throw new NotFoundException('Chat Not Found');
    if (chat.type === ChatType.PRIVATE) {
      throw new BadRequestException('Only Members In Groups Can Be Edited');
    }

    const sender: ChatMember | undefined = chat.members.find((member: ChatMember) => {
      return member.userUuid == user;
    });

    if (!sender) throw new NotFoundException('User Not Found');
    if (sender.role === GroupRole.MEMBER) throw new UnauthorizedException('Lacking Permissions');
    if (sender.role === GroupRole.ADMIN) {
      const admin: ChatAdmin | undefined = chat.admins.find((admin: ChatAdmin) => {
        return admin.userUuid == user;
      });
      if (!admin) throw new NotFoundException('Admin Not Found');
      const canEdit: boolean = !!admin.permissions.find((permission: AdminPermission) => {
        return permission.permission == Permission.USERS;
      });
      if (!canEdit) throw new UnauthorizedException('Lacking Permissions');
      if (roleId === GroupRole.OWNER) throw new BadRequestException("Admin Can't Set Owner");
    }

    const member: ChatMember | undefined = chat.members.find((member: ChatMember) => {
      return member.userUuid === data.user;
    });
    if (!member) throw new NotFoundException('User Not Found');
    if (member.userUuid === sender.userUuid) {
      throw new BadRequestException('You Can Only Edit Other Members');
    }

    if (roleId === GroupRole.OWNER) {
      await this.chatMemberRepository.save({ ...sender, role: GroupRole.MEMBER });
      await this.chatMemberRepository.save({ ...member, role: GroupRole.OWNER });
      return [member, sender];
    }
    if (roleId === GroupRole.ADMIN) {
      if (member.role === GroupRole.ADMIN) {
        const admin: ChatAdmin | undefined = chat.admins.find((admin: ChatAdmin) => {
          return admin.userUuid === data.user;
        });
        if (!admin) throw new NotFoundException('Admin Not Found');
        if (admin.permissions.map((p: AdminPermission) => p.permission) === data.permissions) {
          throw new BadRequestException('Admin Has Already This Permissions');
        }
        await this.chatAdminRepository.save({
          ...admin,
          permissions: await Promise.all(
            data.permissions.map(async (perm: Permission) => {
              const permission: AdminPermission = new AdminPermission();
              permission.permission = perm;
              await this.adminPermissionRepository.save(permission);
              return permission;
            })
          ),
        });
        return admin;
      } else {
        const admin: ChatAdmin = new ChatAdmin();
        admin.chat = chat;
        admin.user = member.user;
        admin.permissions = data.permissions.map((perm: Permission) => {
          const permission: AdminPermission = new AdminPermission();
          permission.permission = perm;
          return permission;
        });
        await this.chatMemberRepository.save({ ...member, role: GroupRole.ADMIN });
        await this.chatAdminRepository.save(admin);
        return admin;
      }
    }
    if (member.role === GroupRole.MEMBER) throw new BadRequestException('User Is Already Member');
    const admin: ChatAdmin | undefined = chat.admins.find((admin: ChatAdmin) => {
      return admin.userUuid == data.user;
    });
    if (!admin) throw new NotFoundException('Admin Not Found');
    await this.chatAdminRepository.remove(admin);
    await this.chatMemberRepository.save({ ...member, role: GroupRole.MEMBER });
    return member;
  }
}
