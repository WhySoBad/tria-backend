import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Chat } from './Chat.entity';
import { User } from './User.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid') uuid: string;

  @Column('uuid') chatUuid: string;

  @Column('uuid') userUuid: string;

  @CreateDateColumn({ type: 'timestamp' }) createdAt: string;

  @Column({ type: 'timestamp', nullable: true }) editedAt: string;

  @Column({ type: 'int', default: 0 }) edited: number;

  @Column({ type: 'text' }) text: string;

  @Column({ type: 'boolean', default: false }) pinned: boolean;

  @ManyToOne(() => Chat, (chat) => chat.messages, { onDelete: 'CASCADE' })
  chat: Chat;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}
