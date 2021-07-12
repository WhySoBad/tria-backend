import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

const config: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.HOST,
  port: 3306,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migration', '*.{ts,js}')],
  synchronize: false,
  autoLoadEntities: true,
  logging: ['error'],
  keepConnectionAlive: true,
  migrationsRun: false,
  cli: {
    migrationsDir: 'src/migration',
  },
  timezone: '+1',
};

export = config;
