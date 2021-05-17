import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filters/GlobalExceptionFilter.filter';
import { GlobalResponseInterceptor } from './interceptors/GlobalResponseInterceptor.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalInterceptors(new GlobalResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useStaticAssets(join(__dirname, '..', 'static'));
  app.enableCors({
    origin: ['http://localhost:*', 'http://127.0.0.1:*'],
    credentials: true,
  });
  app.listen(3000);
}
bootstrap();
