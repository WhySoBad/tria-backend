import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class BlacklistToken {
  @PrimaryColumn('uuid') uuid: string;

  @Column('timestamp') expires: string;
}
