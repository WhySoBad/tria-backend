import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { AdminPermission } from './AdminPermission.entity';
import { Chat } from './Chat.entity';
import { User } from './User.entity';

@Entity()
@Index(['userUuid', 'chatUuid'], { unique: true })
export class ChatAdmin {
  /**
   * Uuid of the user
   */

  @Column({ type: 'uuid', primary: true, unique: false }) userUuid: string;

  /**
   * Uuid of the chat
   */

  @Column({ type: 'uuid', primary: true, unique: false }) chatUuid: string;

  /**
   * Timestamp of the promotion
   */

  @CreateDateColumn({ type: 'timestamp' }) promotedAt: Date;

  /**
   * Permissions of the admin
   */

  @OneToMany(() => AdminPermission, (adminPermission) => adminPermission.admin, {
    onDelete: 'CASCADE',
  })
  permissions: Array<AdminPermission>;

  /**
   * Related user
   */

  @ManyToOne(() => User, (user) => user.chats, { onDelete: 'CASCADE' })
  user: User;

  /**
   * Related chat
   */

  @ManyToOne(() => Chat, (chat) => chat.members, { onDelete: 'CASCADE' })
  chat: Chat;
}
