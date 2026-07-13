import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Redis } from 'ioredis';

import { ApiConfigService } from '../../shared/services/api-config.service';
import { CacheService } from './cache.service';
import { IO_REDIS_KEY } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: IO_REDIS_KEY,
      useFactory: (configService: ApiConfigService) => {
        const logger = new Logger('RedisProvider');
        const redis = new Redis({
          host: configService.redisConfig.host,
          port: configService.redisConfig.port,
          password: configService.redisConfig.password,
          db: configService.redisConfig.db,
          lazyConnect: true, // Don't connect immediately
        });

        redis.on('error', (error) => {
          logger.error('Redis connection error:', error);
        });

        redis.connect().catch((error: unknown) => {
          logger.error(
            'Failed to connect to Redis during startup',
            error instanceof Error ? error.stack : String(error),
          );
        });

        return redis;
      },
      inject: [ApiConfigService],
    },
    CacheService,
  ],
  exports: [CacheService],
})
export class CacheModule implements OnApplicationShutdown {
  private readonly logger = new Logger(CacheModule.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  async onApplicationShutdown(_signal?: string): Promise<void> {
    const redis = this.moduleRef.get<Redis>(IO_REDIS_KEY, { strict: false });

    try {
      await Promise.race([
        redis.quit(),
        new Promise<void>((resolve) => {
          setTimeout(resolve, 1_000);
        }),
      ]);
    } catch (error: unknown) {
      this.logger.warn(
        'Failed to close Redis cleanly during shutdown',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
