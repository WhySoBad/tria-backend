import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { unlinkSync } from 'fs';
import { access } from 'fs/promises';
import { async } from 'rxjs';
import { Admin, Repository } from 'typeorm';
import { config } from '../../config';
import { AdminPermission } from '../../entities/AdminPermission.entity';
import { BannedMember } from '../../entities/BannedMember.entity';
import { Chat } from '../../entities/Chat.entity';
import { ChatAdmin } from '../../entities/ChatAdmin.entity';
import { ChatMember } from '../../entities/ChatMember.entity';
import { MemberLog } from '../../entities/MemberLog.entity';
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
    @InjectRepository(MemberLog) private memberLogRepository: Repository<MemberLog>,
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
    const user: User | undefined = await this.getUser(payload.user);
    if (!user) throw new NotFoundException('User Not Found');
    const participant: User | undefined = await this.getUser(participantUuid);
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
    const creator: ChatMember = new ChatMember();
    creator.lastRead = new Date();
    creator.user = user;
    creator.chat = chat;
    const member: ChatMember = new ChatMember();
    member.lastRead = new Date();
    member.user = participant;
    member.chat = chat;

    chat.type = ChatType.PRIVATE;
    chat.members = [creator, member];

    await this.chatRepository.save(chat);

    const logs: Array<MemberLog> = [];

    for await (const member of chat.members) {
      const log: MemberLog = new MemberLog();
      log.chat = chat;
      log.chatUuid = chat.uuid;
      log.user = member.user;
      log.userUuid = member.userUuid;
      log.joined = true;
      await this.memberLogRepository.save(log);
      logs.push(log);
    }

    chat.memberLog = logs;
    await this.chatRepository.save(chat);
    await this.chatMemberRepository.save(chat.members);
    await this.chatGateway.handlePrivateCreate(chat);
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
    const user: User | undefined = await this.getUser(payload.user);
    if (!user) throw new NotFoundException('User Not Found');

    const users: Array<{ user: User; role: number }> = [];
    for await (const { uuid, role } of settings.members) {
      const roleId: number = GroupRole[role as any] as any;
      const user: User | undefined = await this.getUser(uuid);
      if (user) users.push({ user: user, role: roleId });
    }

    const existing:
      | Chat
      | undefined = await this.chatRepository
      .createQueryBuilder()
      .where('LOWER(tag) = LOWER(:tag)', { tag: settings.tag })
      .getOne();

    if (existing) throw new BadRequestException('Group Tag Has To Be Unique');

    const chat: Chat = new Chat();
    const participants: Array<ChatMember> = users.map(({ user, role }) => {
      const participant: ChatMember = new ChatMember();
      participant.lastRead = new Date();
      participant.user = user;
      participant.chat = chat;
      participant.role = role;
      return participant;
    });

    const owner: ChatMember = new ChatMember();
    owner.lastRead = new Date();
    owner.user = user;
    owner.chat = chat;
    owner.role = GroupRole.OWNER;
    chat.type = ChatType[settings.type] as any;
    chat.members = [];
    chat.name = settings.name;
    chat.tag = settings.tag;
    chat.description = settings.description;

    await this.chatRepository.save(chat);

    for await (const member of participants) {
      if (member.role !== GroupRole.ADMIN) continue;
      const admin: ChatAdmin = new ChatAdmin();
      admin.chat = chat;
      admin.user = member.user;
      admin.permissions = [];
      await this.chatAdminRepository.save(admin);
    }

    chat.members = [...participants, owner];
    await this.chatMemberRepository.save([...participants, owner]);

    for await (const member of chat.members) {
      const log: MemberLog = new MemberLog();
      log.chat = chat;
      log.chatUuid = chat.uuid;
      log.user = member.user;
      log.userUuid = member.userUuid;
      log.joined = true;
      await this.memberLogRepository.save(log);
    }

    await this.chatRepository.save(chat);

    const finalChat: Chat | undefined = await this.handleGet(chat.uuid);
    if (finalChat) await this.chatGateway.handleGroupCreate(finalChat);
  }

  /**
   * Function to check whether a given tag exists
   *
   * @param tag tag to be checked
   *
   * @returns Promise<boolean>
   */

  async handleTagVerify(tag: string): Promise<boolean> {
    return !!(await this.chatRepository
      .createQueryBuilder()
      .where('LOWER(tag) = LOWER(:tag)', { tag: tag })
      .getOne());
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
    const chat: Chat | undefined = await this.getChat(chatUuid);
    if (!chat) throw new NotFoundException('Group Not Found');
    if (chat.type == ChatType.PRIVATE) {
      throw new BadRequestException('Chat Has To Be Group');
    }

    const banned: BannedMember | undefined = chat.banned.find((member: BannedMember) => {
      return member.userUuid == payload.user;
    });
    if (banned) throw new ForbiddenException('User Is Banned');
    const exists: ChatMember | undefined = await this.getMember(chat, payload.user);
    if (exists) throw new BadRequestException('User Is Already Joined');

    const user: User | undefined = await this.getUser(payload.user);
    if (!user) throw new NotFoundException('User Not Found');

    const log: MemberLog = new MemberLog();
    log.chat = chat;
    log.chatUuid = chat.uuid;
    log.user = user;
    log.userUuid = user.uuid;
    log.joined = true;
    await this.memberLogRepository.save(log);

    const member: ChatMember = new ChatMember();
    member.lastRead = new Date();
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
    const chat: Chat | undefined = await this.getChat(chatUuid);
    if (!chat) throw new NotFoundException('Group Not Found');
    if (chat.type === ChatType.PRIVATE) {
      throw new BadRequestException('Chat Has To Be Group');
    }
    const user: ChatMember | undefined = await this.getMember(chat, payload.user);
    if (!user) throw new NotFoundException('User Not Found');
    if (user.role === GroupRole.OWNER) {
      throw new BadRequestException("Owner Can't Leave The Group");
    }

    await this.leaveChat(chat, user);
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
    const chat: Chat | undefined = await this.getChat(chatUuid);
    if (!chat) throw new NotFoundException('Chat Not Found');
    const user: ChatMember | undefined = await this.getMember(chat, payload.user);
    if (!user) throw new NotFoundException('User Not Found');
    if (chat.type !== ChatType.PRIVATE && user.role !== GroupRole.OWNER) {
      throw new UnauthorizedException('Only Owner Can Delete A Group');
    }
    await this.deleteChat(chat);
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
    const chat: Chat | undefined = await this.getChat(chatUuid);
    if (!chat) throw new NotFoundException('Chat Not Found');
    if (chat.type == ChatType.PRIVATE) throw new BadRequestException('Chat Has To Be Group');
    const existing: BannedMember | undefined = await this.bannedMemberRepository.findOne({
      userUuid: uuid,
      chatUuid: chatUuid,
    });
    if (existing) throw new BadRequestException('User Is Already Banned');
    const member: ChatMember | undefined = await this.getMember(chat, uuid);
    if (!member) throw new NotFoundException('User Not Found');
    if (member.role === GroupRole.OWNER) throw new UnauthorizedException("Owner Can't Be Banned");

    const banned: BannedMember = new BannedMember();
    banned.chat = chat;
    banned.chatUuid = chat.uuid;
    banned.user = member.user;
    banned.userUuid = member.userUuid;

    await this.bannedMemberRepository.save(banned);
    await this.chatMemberRepository.remove(member);
    this.chatGateway.handleMemberBan(chat.uuid, banned.userUuid);
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
    const chat: Chat | undefined = await this.getChat(chatUuid);
    if (!chat) throw new NotFoundException('Chat Not Found');
    if (chat.type == ChatType.PRIVATE) throw new BadRequestException('Chat Has To Be Group');
    const existing: BannedMember | undefined = await this.bannedMemberRepository.findOne({
      userUuid: uuid,
      chatUuid: chatUuid,
    });
    if (!existing) throw new NotFoundException("User Isn't Banned");
    const member: BannedMember | undefined = chat.banned.find((member: BannedMember) => {
      return member.userUuid == uuid;
    });
    if (!member) throw new NotFoundException('User Not Found');
    await this.bannedMemberRepository.remove(member);
    this.chatGateway.handleMemberUnban(chat.uuid, uuid);
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
    const chat: Chat | undefined = await this.getChat(chatUuid);
    if (!chat) throw new NotFoundException('Chat Not Found');
    if (chat.type == ChatType.PRIVATE) throw new BadRequestException('Chat Has To Be Group');
    const member: ChatMember | undefined = await this.getMember(chat, uuid);
    if (!member) throw new NotFoundException('User Not Found');
    if (member.role === GroupRole.OWNER) throw new UnauthorizedException("Owner Can't Be Kicked");
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
      .leftJoinAndSelect('chat.memberLog', 'memberLog')
      .getOne();
    if (!chat) throw new NotFoundException('Chat Not Found');
    return chat;
  }

  /**
   * Function to update the last read timestamp of a member
   *
   * @param chatUuid chat uuid
   *
   * @param timestamp new timestamp
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<void>
   */

  async handleMessageRead(
    chatUuid: string,
    timestamp: number,
    payload: TokenPayload
  ): Promise<void> {
    if (timestamp > new Date().getTime()) {
      throw new BadRequestException("Timestamp Can't Be In The Future");
    }
    const member: ChatMember | undefined = await this.getMember(chatUuid, payload.user);
    if (!member) throw new NotFoundException('User Not Found');
    if (member.lastRead.getTime() > timestamp) {
      throw new BadRequestException('User Has Already Read Further');
    }
    member.lastRead = new Date(timestamp + 1000);
    console.log(member.lastRead.getTime(), timestamp);
    await this.chatMemberRepository.save(member);
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
    const chat: Chat | undefined = await this.getChat(chatUuid);
    if (!chat) throw new NotFoundException('Chat Not Found');
    const sender: ChatMember | undefined = await this.getMember(chat, user);
    if (!sender) throw new NotFoundException('Sender Has To Be Chat Member');
    const message: Message = new Message();
    message.chatUuid = chatUuid;
    message.userUuid = sender.userUuid;
    message.text = text;
    await this.messageRepository.save(message);
    sender.lastRead = new Date();
    await this.chatMemberRepository.save(sender);
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
    const chat: Chat | undefined = await this.getChat(chatUuid);
    if (!chat) throw new NotFoundException('Chat Not Found');
    if (chat.type === ChatType.PRIVATE) throw new BadRequestException('Only Groups Can Be Edited');
    if (tag) {
      const group = await this.chatRepository
        .createQueryBuilder()
        .where('LOWER(tag) = LOWER(:tag)', { tag: tag })
        .getOne();
      if (group) throw new BadRequestException('Group Tag Has To Be Unique');
    }
    const member: ChatMember | undefined = await this.getMember(chat, user);
    if (!member) throw new NotFoundException('User Not Found In Group');
    if (member.role === GroupRole.MEMBER) throw new UnauthorizedException('Lacking Permissions');
    else if (member.role === GroupRole.ADMIN) {
      const admin: ChatAdmin | undefined = await this.getAdmin(chat, user);
      if (!admin) throw new NotFoundException('Admin Not Found In Group');
      const hasPermission: boolean = await this.hasPermission(member, Permission.CHAT_EDIT);
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

    const sender: ChatMember | undefined = await this.getMember(message.chat, user);
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
    const permissions: Array<number> = data.permissions.map((permission: Permission) => {
      return Permission[permission] as any;
    });

    const chat: Chat | undefined = await this.getChat(chatUuid);
    if (!chat) throw new NotFoundException('Chat Not Found');
    if (chat.type === ChatType.PRIVATE) {
      throw new BadRequestException('Only Members In Groups Can Be Edited');
    }

    const sender: ChatMember | undefined = await this.getMember(chat, user);
    if (!sender) throw new NotFoundException('User Not Found');
    if (sender.role === GroupRole.MEMBER) throw new UnauthorizedException('Lacking Permissions');
    if (sender.role === GroupRole.ADMIN) {
      const canEdit: boolean = await this.hasPermission(sender, Permission.MEMBER_EDIT);
      if (!canEdit) throw new UnauthorizedException('Lacking Permissions');
      if (roleId === GroupRole.OWNER) throw new BadRequestException("Admin Can't Set Owner");
    }

    const member: ChatMember | undefined = await this.getMember(chat, data.user);
    if (!member) throw new NotFoundException('User Not Found');
    if (member.userUuid === sender.userUuid) {
      throw new BadRequestException('You Can Only Edit Other Members');
    }

    if (roleId === GroupRole.OWNER) {
      if (member.role === GroupRole.ADMIN) {
        const admin: ChatAdmin | undefined = await this.getAdmin(chat.uuid, member.userUuid);
        if (admin) await this.chatAdminRepository.remove(admin);
      }
      await this.chatMemberRepository.save({ ...sender, role: GroupRole.MEMBER });
      await this.chatMemberRepository.save({ ...member, role: GroupRole.OWNER });
      return [member, sender];
    }
    if (roleId === GroupRole.ADMIN) {
      if (member.role === GroupRole.ADMIN) {
        const admin: ChatAdmin | undefined = await this.getAdmin(chat, data.user);
        if (!admin) throw new NotFoundException('Admin Not Found');
        const currentPermissions: Array<AdminPermission> = await this.adminPermissionRepository.find(
          { chatUuid: chat.uuid, userUuid: member.userUuid }
        );
        await this.adminPermissionRepository.remove(currentPermissions);
        const newPermissions: Array<AdminPermission> = [];

        for (const perm of permissions) {
          const permission: AdminPermission = new AdminPermission();
          permission.permission = perm;
          permission.userUuid = admin.userUuid;
          permission.chatUuid = admin.chatUuid;
          await this.adminPermissionRepository.save(permission);
          newPermissions.push(permission);
        }
        admin.permissions = newPermissions;
        await this.chatAdminRepository.save(admin);
        return admin;
      } else {
        const admin: ChatAdmin = new ChatAdmin();
        admin.chat = chat;
        admin.user = member.user;
        admin.permissions = [];
        member.role = GroupRole.ADMIN;
        await this.chatAdminRepository.save(admin);
        admin.permissions = await Promise.all(
          permissions.map(async (perm: Permission) => {
            const permission: AdminPermission = new AdminPermission();
            permission.permission = perm;
            permission.userUuid = member.userUuid;
            permission.chatUuid = chat.uuid;
            await this.adminPermissionRepository.save(permission);
            return permission;
          })
        );
        await this.chatMemberRepository.save(member);
        await this.chatAdminRepository.save(admin);
        return admin;
      }
    }
    if (member.role === GroupRole.MEMBER) throw new BadRequestException('User Is Already Member');
    const admin: ChatAdmin | undefined = await this.getAdmin(chat, data.user);
    if (!admin) throw new NotFoundException('Admin Not Found');
    await this.chatAdminRepository.remove(admin);
    await this.chatMemberRepository.save({ ...member, role: GroupRole.MEMBER });
    return member;
  }

  /**
   * Function to validify that an avatar exists
   *
   * @param uuid uuid of the avatar
   *
   * @returns Promise<void>
   */

  async handleAvatarGet(uuid: string): Promise<void> {
    await access(`./data/avatar/group/${uuid}${config.avatarType}`).catch(() => {
      throw new NotFoundException('Avatar Not Found');
    });
  }

  /**
   * Function to handle an avatar upload
   *
   * @param file uploaded file
   *
   * @param payload payload of user jwt
   *
   * @param uuid uuid of the avatar
   *
   * @returns Promise<void>
   */

  async handleAvatarUpload(
    file: Express.Multer.File,
    payload: TokenPayload,
    uuid: string
  ): Promise<void> {
    if (!file) throw new BadRequestException('Invalid File');
    const chat: Chat | undefined = await this.getChat(uuid);
    if (!chat) throw new NotFoundException('Chat Not Found');
    chat.avatar = uuid;
    await this.chatRepository.save(chat);
    await this.chatGateway.handleEdit(chat);
  }

  /**
   * Function to handle an avatar deletion
   *
   * @param payload payload of user jwt
   *
   * @param chatUuid uuid of the avatar
   *
   * @returns Promise<void>
   */

  async handleAvatarDelete(payload: TokenPayload, chatUuid: string): Promise<void> {
    try {
      const chat: Chat | undefined = await this.getChat(chatUuid);
      if (!chat) throw new NotFoundException('Chat Not Found');
      if (chat.type === ChatType.PRIVATE) {
        throw new BadRequestException('Chat Has To Be Of Type Group');
      }
      const user: ChatMember | undefined = await this.getMember(chat, payload.user);
      if (!user) throw new NotFoundException('User Not Found');

      const hasPermission: boolean = await this.hasPermission(user, Permission.CHAT_EDIT);
      if (!hasPermission) throw new UnauthorizedException('Lacking Permissions');

      unlinkSync(`./data/avatar/group/${chatUuid}${config.avatarType}`);
      chat.avatar = null;
      await this.chatRepository.save(chat);
      await this.chatGateway.handleEdit(chat);
    } catch (exception) {
      throw new NotFoundException('Avatar Not Found');
    }
  }

  /**
   * Function to get a specific user
   *
   * @param uuid uuid of the user
   *
   * @returns Promise<User | undefined>
   */

  async getUser(uuid: string): Promise<User | undefined> {
    const user: User | undefined = await this.userRepository.findOne({ uuid: uuid });
    return user;
  }

  /**
   * Function to get a chat
   *
   * @param uuid uuid of the chat
   *
   * @returns Promise<Chat | undefined>
   */

  async getChat(uuid: string): Promise<Chat | undefined> {
    const chat: Chat | undefined = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.uuid = :uuid', { uuid: uuid })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .leftJoinAndSelect('chat.banned', 'banned')
      .leftJoinAndSelect('chat.admins', 'admins')
      .leftJoinAndSelect('admins.permissions', 'permissions')
      .getOne();
    return chat;
  }

  /**
   * Function to get a chat member
   *
   * @param chat chat or chat uuid
   *
   * @param user user or user uuid
   *
   * @returns Promise<ChatMember | undefined>
   */

  async getMember(chat: string | Chat, user: string | User): Promise<ChatMember | undefined> {
    const cUuid: string = chat instanceof Chat ? chat.uuid : chat;
    const uUuid: string = user instanceof User ? user.uuid : user;
    const c: Chat | undefined = await this.getChat(cUuid);
    const member: ChatMember | undefined = c?.members?.find(({ userUuid }) => userUuid === uUuid);
    return member;
  }

  /**
   * Function to get a chat admin
   *
   * @param chat chat or chat uuid
   *
   * @param user user or user uuid
   *
   * @returns Promise<ChatAdmin | undefined>
   */

  async getAdmin(chat: string | Chat, user: string | User): Promise<ChatAdmin | undefined> {
    const cUuid: string = chat instanceof Chat ? chat.uuid : chat;
    const uUuid: string = user instanceof User ? user.uuid : user;
    const c: Chat | undefined = await this.getChat(cUuid);
    const admin: ChatAdmin | undefined = c?.admins?.find(({ userUuid }) => userUuid === uUuid);
    return admin;
  }

  /**
   * Function to get whether a chat member has a given permission
   *
   * @param member chat member
   *
   * @param permission permission to be checked
   *
   * @returns Promise<boolean>
   */

  async hasPermission(member: ChatMember, permission: Permission): Promise<boolean> {
    const chat: Chat | undefined = await this.getChat(member.chatUuid);
    const mem: ChatMember | undefined = await this.getMember(member.chatUuid, member.userUuid);
    if (!mem || !chat) return false;
    if (mem.role === GroupRole.MEMBER) return false;
    if (mem.role === GroupRole.ADMIN) {
      const admin: ChatAdmin | undefined = await this.getAdmin(chat, mem.userUuid);
      if (!admin) return false;
      return !!admin.permissions.find((perm: AdminPermission) => {
        return permission === perm.permission;
      });
    } else return true;
  }

  /**
   * Function to leave a chat
   *
   * Important: Internal use only
   *
   * @param chat chat
   *
   * @param member member
   *
   * @returns Promise<void>
   */

  async leaveChat(chat: Chat, member: ChatMember): Promise<void> {
    const log: MemberLog = new MemberLog();
    log.chat = chat;
    log.chatUuid = chat.uuid;
    log.user = member.user;
    log.userUuid = member.userUuid;
    log.joined = true;
    await this.memberLogRepository.save(log);

    await this.chatMemberRepository.remove(member);
    this.chatGateway.handleGroupUserLeave(chat.uuid, log.userUuid);
  }

  /**
   * Function to delete a chat
   *
   * Important: Internal use only
   *
   * @param chat chat
   *
   * @returns Promise<void>
   */

  async deleteChat(chat: Chat): Promise<void> {
    const uuid: string = chat.uuid;
    await this.chatRepository.remove(chat);
    this.chatGateway.handleChatDelete(uuid);
  }
}
