import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermission } from '../../entities/AdminPermission.entity';
import { BannedMember } from '../../entities/BannedMember.entity';
import { Chat } from '../../entities/Chat.entity';
import { ChatAdmin } from '../../entities/ChatAdmin.entity';
import { ChatMember } from '../../entities/ChatMember.entity';
import { User } from '../../entities/User.entity';
import { AuthModule } from '../Auth/Auth.module';
import { ChatController } from './Chat.controller';
import { ChatService } from './Chat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Chat, ChatMember, BannedMember, ChatAdmin, AdminPermission]),
    AuthModule,
  ],
  exports: [],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
