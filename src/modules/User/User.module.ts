import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PendingUser } from '../../entities/PendingUser.entity';
import { User } from '../../entities/User.entity';
import { AuthModule } from '../Auth/Auth.module';
import { AuthService } from '../Auth/Auth.service';
import { ChatModule } from '../Chat/Chat.module';
import { UserController } from './User.controller';
import { UserGateway } from './User.gateway';
import { UserService } from './User.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, PendingUser]), AuthModule, ChatModule],
  controllers: [UserController],
  providers: [UserService, AuthService, UserGateway],
  exports: [UserService],
})
export class UserModule {}
