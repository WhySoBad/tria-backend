import { CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Chat } from './Chat.entity';
import { User } from './User.entity';

@Entity()
@Index(['userUuid', 'chatUuid'], { unique: true })
export class BannedMember {
  /**
   * Uuid of the user
   */

  @PrimaryColumn({ type: 'uuid', name: 'userUuid' }) userUuid: string;

  /**
   * Uuid of the chat
   */

  @PrimaryColumn({ type: 'uuid', name: 'chatUuid' }) chatUuid: string;

  /**
   * Timestamp when the user was banned
   */

  @CreateDateColumn({ type: 'timestamp' }) bannedAt: Date;

  /**
   * Related user
   */

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userUuid' })
  user: User;

  /**
   * Related chat
   */

  @ManyToOne(() => Chat, (chat) => chat.banned, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatUuid' })
  chat: Chat;
}
