import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { IChatRole } from '../routes/Chat/Chat.interface';
import { Chat } from './Chat.entity';
import { User } from './User.entity';

@Entity()
@Index('compound', ['userUuid', 'chatUuid'], { unique: true })
export class ChatMember {
  @Column({
    type: 'uuid',
    primary: true,
    unique: false,
    name: 'userUuid',
  })
  userUuid: string;

  @Column({
    type: 'uuid',
    primary: true,
    unique: false,
    name: 'chatUuid',
  })
  chatUuid: string;

  @CreateDateColumn({ type: 'timestamp' })
  joinedAt: Date;

  @Column({ type: 'int', default: IChatRole.MEMBER }) role: IChatRole;

  @OneToOne(() => User)
  user: User;

  @OneToOne(() => Chat)
  chat: Chat;
}
