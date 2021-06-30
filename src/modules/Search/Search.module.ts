import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chat } from '../../entities/Chat.entity';
import { User } from '../../entities/User.entity';
import { AuthModule } from '../Auth/Auth.module';
import { SearchController } from './Search.controller';
import { SearchService } from './Search.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Chat]), AuthModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
