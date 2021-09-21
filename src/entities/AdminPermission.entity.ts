import { Entity, Index, JoinColumn, JoinTable, ManyToOne, PrimaryColumn } from 'typeorm';
import { Permission } from '../modules/Chat/Chat.interface';
import { ChatAdmin } from './ChatAdmin.entity';

@Entity()
@Index(['userUuid', 'chatUuid', 'permission'], { unique: true })
export class AdminPermission {
  /**
   * Permission of the admin
   */

  @PrimaryColumn('int')
  permission: Permission;

  /**
   * Uuid of the user
   */

  @PrimaryColumn({ type: 'uuid', name: 'userUuid' }) userUuid: string;

  /**
   * Uuid of the chat
   */

  @PrimaryColumn({ type: 'uuid', name: 'chatUuid' }) chatUuid: string;

  /**
   * Related admin
   */

  @ManyToOne(() => ChatAdmin, (chatAdmin) => chatAdmin.permissions, {
    onDelete: 'CASCADE',
  })
  @JoinTable({ name: 'admin_permission' })
  @JoinColumn([
    { name: 'chatUuid', referencedColumnName: 'chatUuid' },
    { name: 'userUuid', referencedColumnName: 'userUuid' },
  ])
  admin: Array<ChatAdmin>;
}
