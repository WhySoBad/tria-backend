import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PendingUser {
  /**
   * Uuid of the user
   */

  @PrimaryGeneratedColumn('uuid') uuid: string;

  /**
   * Timestamp when the user was created
   */

  @CreateDateColumn({ type: 'timestamp' }) createdAt: Date;

  /**
   * Timestamp when the pending user expires
   */

  @Column({ type: 'timestamp' }) expires: Date = new Date(new Date().getTime() + 604800000);

  /**
   * Mail address of the user
   */

  @Column({ type: 'text' }) mail: string;

  /**
   * Hashed password of the user
   */

  @Column({ type: 'text' }) password: string;
}
