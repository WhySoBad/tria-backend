import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PendingUser {
  @PrimaryGeneratedColumn('uuid') uuid: string;

  @CreateDateColumn({ type: 'timestamp' }) createdAt: Date;

  @Column({ type: 'timestamp', default: new Date(new Date().getTime() + 604800000) }) expires: Date;

  @Column({ type: 'text' }) mail: string;

  @Column({ type: 'text' }) password: string;
}
