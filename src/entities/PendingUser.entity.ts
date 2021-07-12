import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PendingUser {
  @PrimaryGeneratedColumn('uuid') uuid: string;

  @Column({ type: 'timestamp', default: new Date() })
  createdAt: Date;

  @Column({ type: 'timestamp', default: new Date(new Date().getTime() + 604800000) }) expires: Date;

  @Column('text') mail: string;

  @Column('text') password: string;
}
