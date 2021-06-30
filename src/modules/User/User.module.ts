import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../Auth/Auth.module';
import { UserController } from './User.controller';
import { User } from '../../entities/User.entity';
import { UserService } from './User.service';
import { PendingUser } from '../../entities/PendingUser.entity';
import { AuthService } from '../Auth/Auth.service';
import { BlacklistToken } from '../../entities/BlacklistToken.entity';
import { UserGateway } from './User.gateway';
import { ChatModule } from '../Chat/Chat.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, PendingUser, BlacklistToken]), AuthModule, ChatModule],
  controllers: [UserController],
  providers: [UserService, AuthService, UserGateway],
  exports: [UserService],
})
export class UserModule {}
