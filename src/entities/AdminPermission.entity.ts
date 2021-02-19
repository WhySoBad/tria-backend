import { Entity, JoinTable, ManyToOne, PrimaryColumn } from 'typeorm';
import { IAdminPermission } from '../routes/Chat/Chat.interface';
import { ChatAdmin } from './ChatAdmin.entity';

@Entity()
export class AdminPermission {
  @PrimaryColumn('int')
  permission: IAdminPermission;

  @ManyToOne(() => ChatAdmin, (chatAdmin) => chatAdmin.permissions, { onDelete: 'CASCADE' })
  @JoinTable({ name: 'admin_permission' })
  admins: Array<ChatAdmin>;
}
