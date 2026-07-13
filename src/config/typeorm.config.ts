import path from 'node:path';

import { type DataSourceOptions } from 'typeorm';

import { UserSubscriber } from '../entity-subscribers/user-subscriber';
import { SnakeNamingStrategy } from '../snake-naming.strategy';
import { type IApplicationConfiguration } from './configuration';

export type DatabaseConfiguration = IApplicationConfiguration['database'];

/**
 * Builds the single set of TypeORM options used by Nest and the TypeORM CLI.
 * Paths are relative to this file, so they work from both src/ and dist/.
 */
export function createTypeOrmOptions(
  database: DatabaseConfiguration,
): DataSourceOptions {
  const sourceRoot = path.join(__dirname, '..');

  return {
    type: 'postgres',
    host: database.host,
    port: database.port,
    username: database.username,
    password: database.password,
    database: database.database,
    ssl: database.ssl
      ? { rejectUnauthorized: database.sslRejectUnauthorized }
      : false,
    dropSchema: database.dropSchema,
    synchronize: false,
    migrationsRun: false,
    logging: database.logging,
    namingStrategy: new SnakeNamingStrategy(),
    subscribers: [UserSubscriber],
    entities: [
      path.join(sourceRoot, 'modules/**/*.entity{.ts,.js}'),
      path.join(sourceRoot, 'modules/**/*.view-entity{.ts,.js}'),
    ],
    migrations: [path.join(sourceRoot, 'database/migrations/*{.ts,.js}')],
  };
}
