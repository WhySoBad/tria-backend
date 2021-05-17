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
};

export = config;

// [!] Command to run typeorm migrations [!]
//
//node --require ts-node/register ./node_modules/typeorm/cli.js migration:run --config "src/ormconfig"
//
// [!] Command to create typeorm migration [!]
//
//ts-node ./node_modules/typeorm/cli.js  migration:create "-n" "BlacklistTokenTableExpiresDeleteAt" "-d" "src/migration"
//
// [!] Command to generatoe typeorm migration [!]
//
//ts-node ./node_modules/typeorm/cli.js  migration:generate "-n" "ChatTableGenerate" "-d" "src/migration" --config "src/ormconfig"
