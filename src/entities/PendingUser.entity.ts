import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PendingUser {
  @PrimaryGeneratedColumn('uuid') uuid: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: string;

  @Column({ type: 'timestamp' }) expires: string = new Date(
    new Date().getTime() + 604800000
  ).toISOString();

  @Column('text') mail: string;

  @Column('text') password: string;
}
