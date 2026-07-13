import { Redis } from 'ioredis';

import { createConfiguration, getValidatedEnvironment } from '../config';
import { appDataSource } from '../data-source';
import { invalidateUserAuthorizationVersions } from '../modules/cache/cache.service';
import { runSeeds } from './seeds/run-seeds';

async function main(): Promise<void> {
  const affectedUserIds = await runSeeds(appDataSource);

  if (affectedUserIds.length === 0) {
    return;
  }

  const { redis: redisConfig } = createConfiguration(getValidatedEnvironment());
  const redis = new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    await invalidateUserAuthorizationVersions(redis, affectedUserIds);
  } finally {
    await redis.quit();
  }
}

void main().catch((error: unknown) => {
  console.error('Database seeding failed', error);
  process.exitCode = 1;
});
