import { Column, Entity, Index, ManyToOne, UpdateDateColumn } from 'typeorm';
import { Chat } from './Chat.entity';
import { User } from './User.entity';

@Entity()
@Index(['userUuid', 'chatUuid'], { unique: true })
export class MemberLog {
  @Column({ type: 'uuid', primary: true, unique: false }) userUuid: string;

  @Column({ type: 'uuid', primary: true, unique: false }) chatUuid: string;

  @UpdateDateColumn({ type: 'timestamp' }) timestamp: Date;

  @Column({ type: 'boolean', default: true }) joined: boolean;

  @ManyToOne(() => User, (user) => user.chatLog, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Chat, (chat) => chat.memberLog, { onDelete: 'CASCADE' })
  chat: Chat;
}
