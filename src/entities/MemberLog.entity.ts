import { Column, Entity, Index, ManyToOne, UpdateDateColumn } from 'typeorm';
import { Chat } from './Chat.entity';
import { User } from './User.entity';

@Entity()
@Index(['userUuid', 'chatUuid', 'joined'], { unique: true })
export class MemberLog {
  /**
   * Uuid of the user
   */

  @Column({ type: 'uuid', primary: true, unique: false }) userUuid: string;

  /**
   * Uuid of the chat
   */

  @Column({ type: 'uuid', primary: true, unique: false }) chatUuid: string;

  /**
   * Timestamp of the action
   */

  @UpdateDateColumn({ type: 'timestamp' }) timestamp: Date;

  /**
   * Boolean whether the user joined or left the chat
   */

  @Column({ type: 'boolean', default: true }) joined: boolean;

  /**
   * Related user
   */

  @ManyToOne(() => User, (user) => user.chatLog, { onDelete: 'CASCADE' })
  user: User;

  /**
   * Related chat
   */

  @ManyToOne(() => Chat, (chat) => chat.memberLog, { onDelete: 'CASCADE' })
  chat: Chat;
}
