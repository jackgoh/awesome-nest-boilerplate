import './src/boilerplate.polyfill';

import dotenv from 'dotenv';
import { DataSource } from 'typeorm';

import { UserV2Subscriber } from './src/entity-subscribers/user-v2-subscriber';
import { SnakeNamingStrategy } from './src/snake-naming.strategy';

dotenv.config();

export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  namingStrategy: new SnakeNamingStrategy(),
  subscribers: [UserV2Subscriber],
  entities: [
    'src/modules/**/*.entity{.ts,.js}',
    'src/modules/**/*.view-entity{.ts,.js}',
  ],
  migrations: ['src/database/migrations/*{.ts,.js}'],
});
