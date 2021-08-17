import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/User.entity';
import { AuthController } from './Auth.controller';
import { AuthGateway } from './Auth.gateway';
import { AuthService } from './Auth.service';
import { JwtService } from './Jwt/Jwt.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [AuthService, AuthGateway, JwtService],
  controllers: [AuthController],
  exports: [JwtService],
})
export class AuthModule {}
