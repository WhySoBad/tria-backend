import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Chat } from './Chat.entity';
import { User } from './User.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid') uuid: string;

  @Column('uuid') chatUuid: string;

  @Column('uuid') userUuid: string;

  @CreateDateColumn({ type: 'timestamp' }) createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' }) editedAt: Date;

  @Column({ type: 'int', default: 0 }) edited: number;

  @Column({ type: 'text' }) text: string;

  @Column({ type: 'boolean', default: false }) pinned: boolean;

  @ManyToOne(() => Chat, (chat) => chat.messages, { onDelete: 'CASCADE' })
  chat: Chat;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}
