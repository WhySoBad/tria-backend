import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BannedMember } from './BannedMember.entity';
import { ChatMember } from './ChatMember.entity';
import { MemberLog } from './MemberLog.entity';
import { Message } from './Message.entity';

@Entity()
export class User {
  /**
   * Uuid of the user
   */

  @PrimaryGeneratedColumn('uuid') uuid: string;

  /**
   * Timestamp when the user was created
   */

  @CreateDateColumn({ type: 'timestamp' }) createdAt: Date;

  /**
   * Timestamp when the user was last seen
   */

  @Column({ type: 'timestamp' }) lastSeen: Date;

  /**
   * Mail address of the user
   */

  @Column({ type: 'text' }) mail: string;

  /**
   * Hashed password of the user
   */

  @Column({ type: 'text' }) password: string;

  /**
   * Name of the user
   */

  @Column({ type: 'text' }) name: string;

  /**
   * Tag of the user
   */

  @Column({ type: 'text' }) tag: string;

  /**
   * Description of the user
   */

  @Column({ type: 'text' }) description: string;

  /**
   * Avatar of the user
   */

  @Column({ type: 'text', nullable: true }) avatar: string | null;

  /**
   * Locale of the user
   */

  @Column({ type: 'text' }) locale: string;

  /**
   * Boolean whether the user is online or not
   */

  @Column({ type: 'boolean' }) online: boolean;

  /**
   * Chats of the user
   */

  @OneToMany(() => ChatMember, (chatMember) => chatMember.user)
  @JoinTable({ name: 'chat_member' })
  chats: Array<ChatMember>;

  /**
   * Member logs of the user
   */

  @OneToMany(() => MemberLog, (memberLog) => memberLog.user)
  @JoinTable({ name: 'member_log' })
  chatLog: Array<MemberLog>;

  /**
   * Chats in which the user is banned in
   */

  @OneToMany(() => BannedMember, (bannedMember) => bannedMember.user)
  @JoinTable({ name: 'banned_member' })
  bannedChats: Array<BannedMember>;

  /**
   * Messages of the user
   */

  @OneToMany(() => Message, (message) => message.user)
  messages: Array<Message>;
}
