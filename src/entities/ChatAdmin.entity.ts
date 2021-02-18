import { Column, CreateDateColumn, Entity, Index, ManyToOne } from 'typeorm';
import { IAdminPermissions } from '../routes/Chat/Chat.interface';
import { Chat } from './Chat.entity';
import { User } from './User.entity';

@Entity()
@Index(['userUuid', 'chatUuid'], { unique: true })
export class ChatAdmin {
  @Column('uuid', { primary: true, unique: false }) userUuid: string;

  @Column('uuid', { primary: true, unique: false }) chatUuid: string;

  @CreateDateColumn({ type: 'timestamp' }) promotedAt: Date;

  @Column('int') permissions: IAdminPermissions;

  @ManyToOne(() => User, (user) => user.chats, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Chat, (chat) => chat.members, { onDelete: 'CASCADE' })
  chat: Chat;
}
