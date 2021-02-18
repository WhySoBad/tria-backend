import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IChatType } from '../routes/Chat/Chat.interface';
import { ChatMember } from './ChatMember.entity';
import { Message } from './Message.entity';
import { User } from './User.entity';

@Entity()
export class Chat {
  @PrimaryGeneratedColumn('uuid') uuid: string;

  @Column('int') type: IChatType;

  @Column({ type: 'text', nullable: true }) name: string;

  @Column({ type: 'text', nullable: true }) tag: string;

  @Column({ type: 'text', nullable: true }) description: string;

  @ManyToMany(() => User, (user) => user.chats)
  @JoinTable({ name: 'chat_member' })
  members: Array<User>;

  @OneToMany(() => Message, (message) => message.chat)
  @JoinColumn({ name: 'message' })
  messages: Array<Message>;

  @ManyToMany(() => User)
  @JoinTable({ name: 'chat_admin' })
  admins: Array<User>;
}
