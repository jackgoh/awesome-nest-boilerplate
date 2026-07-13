import { Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { type ThrottlerOptions } from '@nestjs/throttler';
import { type TypeOrmModuleOptions } from '@nestjs/typeorm';

import { configuration, createTypeOrmOptions } from '../../config';
import { GeneratorProvider } from '../../providers/generator.provider';

/**
 * Compatibility facade for existing consumers. Environment parsing and
 * validation live in src/config; this service only exposes typed projections.
 */
@Injectable()
export class ApiConfigService {
  constructor(
    @Inject(configuration.KEY)
    private readonly config: ConfigType<typeof configuration>,
  ) {
    GeneratorProvider.configureS3(this.config.aws);
  }

  get throttlerConfigs(): ThrottlerOptions {
    return this.config.throttler;
  }

  get postgresConfig(): TypeOrmModuleOptions {
    return createTypeOrmOptions(this.config.database);
  }

  get awsS3Config(): ConfigType<typeof configuration>['aws'] {
    return this.config.aws;
  }

  get documentationEnabled(): boolean {
    return this.config.app.documentationEnabled;
  }

  get authConfig(): ConfigType<typeof configuration>['auth'] {
    return this.config.auth;
  }

  get redisConfig(): ConfigType<typeof configuration>['redis'] {
    return this.config.redis;
  }

  get cacheConfig(): ConfigType<typeof configuration>['cache'] {
    return this.config.cache;
  }

  get appConfig(): ConfigType<typeof configuration>['app'] {
    return this.config.app;
  }
}
