import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../Auth/Auth.module';
import { UserController } from './User.controller';
import { User } from '../../entities/User.entity';
import { UserService } from './User.service';
import { PendingUser } from '../../entities/PendingUser.entity';
import { AuthService } from '../Auth/Auth.service';
import { BlacklistToken } from '../../entities/BlacklistToken.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, PendingUser, BlacklistToken]), AuthModule],
  controllers: [UserController],
  providers: [UserService, AuthService],
  exports: [UserService],
})
export class UserModule {}
