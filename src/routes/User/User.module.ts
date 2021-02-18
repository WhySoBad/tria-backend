import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../Auth/Auth.module';
import { UserController } from './User.controller';
import { User } from '../../entities/User.entity';
import { UserService } from './User.service';
import { PendingUser } from '../../entities/PendingUser.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, PendingUser]), AuthModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
