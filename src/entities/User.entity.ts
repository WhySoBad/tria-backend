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
import { Message } from './Message.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid') uuid: string;

  @CreateDateColumn({ type: 'timestamp' }) createdAt: Date;

  @Column('timestamp') lastSeen: Date;

  @Column('text') mail: string;

  @Column('text') password: string;

  @Column('text') name: string;

  @Column('text') tag: string;

  @Column('text') description: string;

  @Column({ type: 'text', nullable: true }) avatar: string | null;

  @Column('text') locale: string;

  @Column('boolean') online: boolean;

  @OneToMany(() => ChatMember, (chatMember) => chatMember.user)
  @JoinTable({ name: 'chat_member' })
  chats: Array<ChatMember>;

  @OneToMany(() => BannedMember, (bannedMember) => bannedMember.user)
  @JoinTable({ name: 'banned_member' })
  bannedChats: Array<BannedMember>;

  @OneToMany(() => Message, (message) => message.user)
  messages: Array<Message>;
}
