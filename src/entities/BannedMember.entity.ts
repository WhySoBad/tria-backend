import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Chat } from './Chat.entity';
import { User } from './User.entity';

@Entity()
@Index(['userUuid', 'chatUuid'], { unique: true })
export class BannedMember {
  @PrimaryColumn({ type: 'uuid', name: 'userUuid' }) userUuid: string;

  @PrimaryColumn({ type: 'uuid', name: 'chatUuid' }) chatUuid: string;

  @CreateDateColumn({ type: 'timestamp' }) bannedAt: Date;

@ManyToOne(() => User, (user) => user.chats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userUuid' })
  user: User;

  @ManyToOne(() => Chat, (chat) => chat.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatUuid' })
  chat: Chat;
}
