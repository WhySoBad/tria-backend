import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './modules/Auth/Auth.module';
import { ChatModule } from './modules/Chat/Chat.module';
import { SearchModule } from './modules/Search/Search.module';
import { UserModule } from './modules/User/User.module';
import * as config from './ormconfig';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(config),
    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        auth: {
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
        },
      },
      template: {
        dir: process.cwd() + '/templates/',
        adapter: new HandlebarsAdapter(),
        options: { strict: true },
      },
    }),
    ChatModule,
    UserModule,
    AuthModule,
    SearchModule,
  ],
  exports: [],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
