import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { GroupRole } from '../modules/Chat/Chat.interface';
import { Chat } from './Chat.entity';
import { User } from './User.entity';

@Entity()
@Index(['userUuid', 'chatUuid'], { unique: true })
export class ChatMember {
  /**
   * Uuid of the user
   */

  @PrimaryColumn({ type: 'uuid', name: 'userUuid' }) userUuid: string;

  /**
   * Uuid of the chat
   */

  @PrimaryColumn({ type: 'uuid', name: 'chatUuid' }) chatUuid: string;

  /**
   * Timestamp when the user joined the chat
   */

  @CreateDateColumn({ type: 'timestamp' }) joinedAt: Date;

  /**
   * Timestamp of the last read message
   */

  @Column({ type: 'timestamp' }) lastRead: Date;

  /**
   * Role of the member
   */

  @Column({ type: 'int', default: GroupRole.MEMBER }) role: GroupRole;

  /**
   * Related user
   */

  @ManyToOne(() => User, (user) => user.chats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userUuid', referencedColumnName: 'uuid' })
  user: User;

  /**
   * Related chat
   */

  @ManyToOne(() => Chat, (chat) => chat.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatUuid', referencedColumnName: 'uuid' })
  chat: Chat;
}
