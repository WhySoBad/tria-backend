import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { IChatRole } from '../modules/Chat/Chat.interface';
import { Chat } from './Chat.entity';
import { User } from './User.entity';

@Entity()
@Index(['userUuid', 'chatUuid'], { unique: true })
export class ChatMember {
  @PrimaryColumn({ type: 'uuid', name: 'userUuid' }) userUuid: string;

  @PrimaryColumn({ type: 'uuid', name: 'chatUuid' }) chatUuid: string;

  @CreateDateColumn({ type: 'timestamp' }) joinedAt: Date;

  @Column({ type: 'int', default: IChatRole.MEMBER }) role: IChatRole;

  @ManyToOne(() => User, (user) => user.chats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userUuid', referencedColumnName: 'uuid' })
  user: User;

  @ManyToOne(() => Chat, (chat) => chat.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatUuid', referencedColumnName: 'uuid' })
  chat: Chat;
}
