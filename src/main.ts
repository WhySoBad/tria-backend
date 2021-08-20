import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cors from 'cors';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filters/GlobalExceptionFilter.filter';
import { GlobalLoggingInterceptor } from './interceptors/GlobalLoggingInterceptor.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalInterceptors(new GlobalLoggingInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.use(cors());
  app.useWebSocketAdapter(new IoAdapter(app));
  app.listen(3000);
}
bootstrap();
