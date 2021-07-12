import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class BlacklistToken {
  @PrimaryColumn({ type: 'uuid' }) uuid: string;

  @Column({ type: 'timestamp' }) expires: Date;
}
