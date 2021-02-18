import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PendingUser {
  @PrimaryGeneratedColumn('uuid') uuid: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp' }) expires: Date = new Date(new Date().getTime() + 604800000);

  @Column('text') name: string;

  @Column('text') tag: string;

  @Column('text') description: string;

  @Column('text') avatar: string;

  @Column('text') locale: string;

  @Column('text') mail: string;

  @Column('text') password: string;
}
