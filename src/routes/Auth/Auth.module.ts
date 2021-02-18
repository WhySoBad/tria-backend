import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlacklistToken } from '../../entities/BlacklistToken.entity';
import { PendingUser } from '../../entities/PendingUser.entity';
import { User } from '../../entities/User.entity';
import { AuthController } from './Auth.controller';
import { AuthService } from './Auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, BlacklistToken])],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
