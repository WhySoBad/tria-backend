import { Column, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { IChatType } from '../modules/Chat/Chat.interface';
import { BannedMember } from './BannedMember.entity';
import { ChatAdmin } from './ChatAdmin.entity';
import { ChatMember } from './ChatMember.entity';
import { Message } from './Message.entity';

@Entity()
export class Chat {
  @PrimaryGeneratedColumn('uuid') uuid: string;

  @Column('int') type: IChatType;

  @Column({ type: 'text', nullable: true }) name: string;

  @Column({ type: 'text', nullable: true }) tag: string;

  @Column({ type: 'text', nullable: true }) description: string;

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
}
