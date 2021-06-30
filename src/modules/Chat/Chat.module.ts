import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermission } from '../../entities/AdminPermission.entity';
import { BannedMember } from '../../entities/BannedMember.entity';
import { Chat } from '../../entities/Chat.entity';
import { ChatAdmin } from '../../entities/ChatAdmin.entity';
import { ChatMember } from '../../entities/ChatMember.entity';
import { MemberLog } from '../../entities/MemberLog.entity';
import { Message } from '../../entities/Message.entity';
import { User } from '../../entities/User.entity';
import { AuthModule } from '../Auth/Auth.module';
import { ChatController } from './Chat.controller';
import { ChatGateway } from './Chat.gateway';
import { ChatService } from './Chat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Chat,
      ChatMember,
      BannedMember,
      ChatAdmin,
      AdminPermission,
      Message,
      MemberLog,
    ]),
    AuthModule,
  ],
  exports: [ChatService],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
})
export class ChatModule {}
