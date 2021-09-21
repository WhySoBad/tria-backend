import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Chat } from './Chat.entity';
import { User } from './User.entity';

@Entity()
export class Message {
  /**
   * Uuid of the message
   */

  @PrimaryGeneratedColumn('uuid') uuid: string;

  /**
   * Uuid of the chat
   */

  @Column({ type: 'uuid' }) chatUuid: string;

  /**
   * Uuid of the user
   */

  @Column({ type: 'uuid' }) userUuid: string;

  /**
   * Timestamp when the message was created
   */

  @CreateDateColumn({ type: 'timestamp' }) createdAt: Date;

  /**
   * Timestamp when the message was edited the last time
   */

  @Column({ type: 'timestamp', nullable: true }) editedAt: Date;

  /**
   * Amount of editions of the message
   */

  @Column({ type: 'int', default: 0 }) edited: number;

  /**
   * Text of the message
   */

  @Column({ type: 'text' }) text: string;

  /**
   * Related chat
   */

  @ManyToOne(() => Chat, (chat) => chat.messages, { onDelete: 'CASCADE' })
  chat: Chat;

  /**
   * Related user
   */

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}
