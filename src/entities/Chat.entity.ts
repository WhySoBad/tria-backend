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
  @PrimaryGeneratedColumn('uuid') uuid: string;

  @Column({ type: 'int' }) type: ChatType;

  @Column({ type: 'text', nullable: true }) name: string | null;

  @Column({ type: 'text', nullable: true }) tag: string | null;

  @Column({ type: 'text', nullable: true }) description: string | null;

  @Column({ type: 'text', nullable: true }) avatar: string | null;

  @CreateDateColumn({ type: 'timestamp' }) createdAt: Date;

  @OneToMany(() => ChatMember, (chatMember) => chatMember.chat)
  @JoinTable({ name: 'chat_member' })
  members: Array<ChatMember>;

  @OneToMany(() => Message, (message) => message.chat)
  @JoinTable({ name: 'message' })
  messages: Array<Message>;

  @OneToMany(() => ChatAdmin, (chatAdmin) => chatAdmin.chat)
  @JoinTable({ name: 'chat_admin' })
  admins: Array<ChatAdmin>;

  @OneToMany(() => BannedMember, (bannedMember) => bannedMember.chat)
  @JoinTable({ name: 'banned_member' })
  banned: Array<BannedMember>;

  @OneToMany(() => MemberLog, (memberLog) => memberLog.chat)
  @JoinTable({ name: 'member_log' })
  memberLog: Array<MemberLog>;
}
