import { Column, Entity, JoinColumn, JoinTable, ManyToOne, PrimaryColumn } from 'typeorm';
import { Permission } from '../modules/Chat/Chat.interface';
import { ChatAdmin } from './ChatAdmin.entity';

@Entity()
export class AdminPermission {
  @PrimaryColumn('int')
  permission: Permission;

  @Column('uuid') chatUuid: string;

  @Column('uuid') userUuid: string;

  @ManyToOne(() => ChatAdmin, (chatAdmin) => chatAdmin.permissions, { onDelete: 'CASCADE' })
  @JoinTable({ name: 'admin_permission' })
  @JoinColumn([
    { name: 'chatUuid', referencedColumnName: 'chatUuid' },
    { name: 'userUuid', referencedColumnName: 'userUuid' },
  ])
  admins: Array<ChatAdmin>;
}
