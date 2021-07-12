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
  @PrimaryGeneratedColumn('uuid') uuid: string;

  @CreateDateColumn({ type: 'timestamp' }) createdAt: Date;

  @Column({ type: 'timestamp' }) lastSeen: Date;

  @Column({ type: 'text' }) mail: string;

  @Column({ type: 'text' }) password: string;

  @Column({ type: 'text' }) name: string;

  @Column({ type: 'text' }) tag: string;

  @Column({ type: 'text' }) description: string;

  @Column({ type: 'text', nullable: true }) avatar: string | null;

  @Column({ type: 'text' }) locale: string;

  @Column({ type: 'boolean' }) online: boolean;

  @OneToMany(() => ChatMember, (chatMember) => chatMember.user)
  @JoinTable({ name: 'chat_member' })
  chats: Array<ChatMember>;

  @OneToMany(() => MemberLog, (memberLog) => memberLog.user)
  @JoinTable({ name: 'member_log' })
  chatLog: Array<MemberLog>;

  @OneToMany(() => BannedMember, (bannedMember) => bannedMember.user)
  @JoinTable({ name: 'banned_member' })
  bannedChats: Array<BannedMember>;

  @OneToMany(() => Message, (message) => message.user)
  messages: Array<Message>;
}
