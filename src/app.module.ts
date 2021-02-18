import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './routes/Auth/Auth.module';
import { UserModule } from './routes/User/User.module';
import { Connection } from 'typeorm';
import * as config from './ormconfig';
import { AppController } from './app.controller';
import { ChatModule } from './routes/Chat/Chat.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot(), //Load .env file
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(config),
    ChatModule,
    UserModule,
    AuthModule,
  ],
  exports: [],
  controllers: [AppController],
  providers: [],
})
export class AppModule {
  constructor(connection: Connection) {}
}
