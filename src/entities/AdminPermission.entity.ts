import { Column, Entity, Index, JoinColumn, JoinTable, ManyToOne, PrimaryColumn } from 'typeorm';
import { Permission } from '../modules/Chat/Chat.interface';
import { ChatAdmin } from './ChatAdmin.entity';

@Entity()
@Index(['userUuid', 'chatUuid'], { unique: true })
export class AdminPermission {
  @PrimaryColumn('int')
  permission: Permission;

  @PrimaryColumn({ type: 'uuid', name: 'userUuid' }) userUuid: string;

  @PrimaryColumn({ type: 'uuid', name: 'chatUuid' }) chatUuid: string;

  @ManyToOne(() => ChatAdmin, (chatAdmin) => chatAdmin.permissions, {
    onDelete: 'CASCADE',
  })
  @JoinTable({ name: 'admin_permission' })
  @JoinColumn([
    { name: 'chatUuid', referencedColumnName: 'chatUuid' },
    { name: 'userUuid', referencedColumnName: 'userUuid' },
  ])
  admins: Array<ChatAdmin>;
}
