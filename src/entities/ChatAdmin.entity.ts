import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { IAdminPermissions } from '../routes/Chat/Chat.interface';
import { Chat } from './Chat.entity';
import { User } from './User.entity';

@Entity()
@Index('compound', ['userUuid', 'chatUuid'], { unique: true })
export class ChatAdmin {
  @Column('uuid', { primary: true, unique: false })
  userUuid: string;

  @Column('uuid', { primary: true, unique: false })
  chatUuid: string;

  @CreateDateColumn({ type: 'timestamp' }) promotedAt: Date;

  @Column('int') permissions: IAdminPermissions;

  @OneToOne(() => User)
  user: User;

  @OneToOne(() => Chat)
  chat: Chat;
}
