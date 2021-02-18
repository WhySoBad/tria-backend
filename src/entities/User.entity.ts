import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Chat } from './Chat.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid') uuid: string;

  @CreateDateColumn({ type: 'timestamp' }) createdAt: Date;

  @Column('text') mail: string;

  @Column('text') password: string;

  @Column('text') name: string;

  @Column('text') tag: string;

  @Column('text') description: string;

  @Column('text') avatar: string;

  @Column('text') locale: string;

  @Column('boolean', { default: false }) verified: boolean;

  @ManyToMany(() => Chat)
  @JoinTable({ name: 'chat_member' })
  chats: Array<Chat>;
}
