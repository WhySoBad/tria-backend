import { ValidationPipe } from '@nestjs/common';
import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cors from 'cors';
import { readFileSync } from 'fs';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filters/GlobalExceptionFilter.filter';
import { GlobalLoggingInterceptor } from './interceptors/GlobalLoggingInterceptor.interceptor';

const getHttpsOptions = (): HttpsOptions | undefined => {
  const privkeyPath: string = process.cwd() + '/cert/privkey.pem';
  const certPath: string = process.cwd() + '/cert/cert.pem';
  try {
    const httpsOptions: HttpsOptions = {
      key: readFileSync(privkeyPath),
      cert: readFileSync(certPath),
    };
    return httpsOptions;
  } catch (exception) {
    return undefined;
  }
};

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    httpsOptions: getHttpsOptions(),
  });
  app.useGlobalInterceptors(new GlobalLoggingInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.use(cors());
  app.useWebSocketAdapter(new IoAdapter(app));
  app.listen(443);
}
bootstrap();
