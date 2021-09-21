import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChatType } from '../modules/Chat/Chat.interface';
import { BannedMember } from './BannedMember.entity';
import { ChatAdmin } from './ChatAdmin.entity';
import { ChatMember } from './ChatMember.entity';
import { MemberLog } from './MemberLog.entity';
import { Message } from './Message.entity';

@Entity()
export class Chat {
  /**
   * Uuid of the chat
   */

  @PrimaryGeneratedColumn('uuid') uuid: string;

  /**
   * Type of the chat
   */

  @Column({ type: 'int' }) type: ChatType;

  /**
   * Name of the chat
   */

  @Column({ type: 'text', nullable: true }) name: string | null;

  /**
   * Tag of the chat
   */

  @Column({ type: 'text', nullable: true }) tag: string | null;

  /**
   * Description of the chat
   */

  @Column({ type: 'text', nullable: true }) description: string | null;

  /**
   * Avatar of the chat
   */

  @Column({ type: 'text', nullable: true }) avatar: string | null;

  /**
   * Timestamp when the chat was created
   */

  @CreateDateColumn({ type: 'timestamp' }) createdAt: Date;

  /**
   * Members of the chat
   */

  @OneToMany(() => ChatMember, (chatMember) => chatMember.chat)
  @JoinTable({ name: 'chat_member' })
  members: Array<ChatMember>;

  /**
   * Messages of the chat
   */

  @OneToMany(() => Message, (message) => message.chat)
  @JoinTable({ name: 'message' })
  messages: Array<Message>;

  /**
   * Admins of the chat
   */

  @OneToMany(() => ChatAdmin, (chatAdmin) => chatAdmin.chat)
  @JoinTable({ name: 'chat_admin' })
  admins: Array<ChatAdmin>;

  /**
   * Banned members of the chat
   */

  @OneToMany(() => BannedMember, (bannedMember) => bannedMember.chat)
  @JoinTable({ name: 'banned_member' })
  banned: Array<BannedMember>;

  /**
   * Member log of the chat
   */

  @OneToMany(() => MemberLog, (memberLog) => memberLog.chat)
  @JoinTable({ name: 'member_log' })
  memberLog: Array<MemberLog>;
}
