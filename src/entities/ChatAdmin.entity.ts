import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { AdminPermission } from './AdminPermission.entity';
import { Chat } from './Chat.entity';
import { User } from './User.entity';

@Entity()
@Index(['userUuid', 'chatUuid'], { unique: true })
export class ChatAdmin {
  @Column('uuid', { primary: true, unique: false }) userUuid: string;

  @Column('uuid', { primary: true, unique: false }) chatUuid: string;

  @CreateDateColumn({ type: 'timestamp' }) promotedAt: Date;

  @OneToMany(() => AdminPermission, (adminPermission) => adminPermission.admins, {
    onDelete: 'CASCADE',
  })
  permissions: Array<AdminPermission>;

  @ManyToOne(() => User, (user) => user.chats, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Chat, (chat) => chat.members, { onDelete: 'CASCADE' })
  chat: Chat;
}
