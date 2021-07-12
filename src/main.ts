import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cors from 'cors';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filters/GlobalExceptionFilter.filter';
import { GlobalResponseInterceptor } from './interceptors/GlobalResponseInterceptor.interceptor';

async function bootstrap(): Promise<void> {
  console.log(new Date().getTimezoneOffset());
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalInterceptors(new GlobalResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.use(cors());
  app.useWebSocketAdapter(new IoAdapter(app));
  app.listen(3000);
}
bootstrap();
