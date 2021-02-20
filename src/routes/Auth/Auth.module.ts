import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlacklistToken } from '../../entities/BlacklistToken.entity';
import { User } from '../../entities/User.entity';
import { AuthController } from './Auth.controller';
import { AuthGateway } from './Auth.gateway';
import { AuthService } from './Auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, BlacklistToken])],
  providers: [AuthService, AuthGateway],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
