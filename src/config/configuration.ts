import { registerAs } from '@nestjs/config';

import {
  type Environment,
  getValidatedEnvironment,
} from './environment.schema';

export interface IApplicationConfiguration {
  app: {
    nodeEnv: Environment['NODE_ENV'];
    port: number;
    apiVersion?: string;
    fallbackLanguage: string;
    documentationEnabled: boolean;
    performanceMonitoringEnabled: boolean;
  };
  auth: {
    privateKey: string;
    publicKey: string;
    jwtExpirationTime: number;
    jwtRefreshExpirationTime: number;
    cookieMaxAge: number;
  };
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl: boolean;
    sslRejectUnauthorized: boolean;
    dropSchema: boolean;
    logging: boolean;
  };
  aws: {
    bucketRegion: string;
    bucketApiVersion: string;
    bucketName: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  cache: {
    defaultTtl: number;
    maxItems: number;
    userPermissionsTtl: number;
  };
  throttler: {
    ttl: number;
    limit: number;
  };
}

const expandEscapedNewlines = (value: string): string =>
  value.replaceAll('\\n', '\n');

export function createConfiguration(
  environment: Environment,
): IApplicationConfiguration {
  return {
    app: {
      nodeEnv: environment.NODE_ENV,
      port: environment.PORT,
      apiVersion: environment.API_VERSION,
      fallbackLanguage: environment.FALLBACK_LANGUAGE,
      documentationEnabled: environment.ENABLE_DOCUMENTATION,
      performanceMonitoringEnabled: environment.ENABLE_PERFORMANCE_MONITORING,
    },
    auth: {
      privateKey: expandEscapedNewlines(environment.JWT_PRIVATE_KEY),
      publicKey: expandEscapedNewlines(environment.JWT_PUBLIC_KEY),
      jwtExpirationTime: environment.JWT_EXPIRATION_TIME,
      jwtRefreshExpirationTime: environment.JWT_REFRESH_EXPIRATION_TIME,
      cookieMaxAge: environment.JWT_REFRESH_EXPIRATION_TIME * 1000,
    },
    database: {
      host: environment.DB_HOST,
      port: environment.DB_PORT,
      username: environment.DB_USERNAME,
      password: environment.DB_PASSWORD,
      database: environment.DB_DATABASE,
      ssl: environment.DB_SSL,
      sslRejectUnauthorized: environment.DB_SSL_REJECT_UNAUTHORIZED,
      dropSchema: environment.DB_DROP_SCHEMA,
      logging: environment.ENABLE_ORM_LOGS,
    },
    aws: {
      bucketRegion: environment.AWS_S3_BUCKET_REGION,
      bucketApiVersion: environment.AWS_S3_API_VERSION,
      bucketName: environment.AWS_S3_BUCKET_NAME,
    },
    redis: {
      host: environment.REDIS_HOST,
      port: environment.REDIS_PORT,
      password: environment.REDIS_PASSWORD,
      db: environment.REDIS_DB,
    },
    cache: {
      defaultTtl: environment.CACHE_DEFAULT_TTL,
      maxItems: environment.CACHE_MAX_ITEMS,
      userPermissionsTtl: environment.CACHE_USER_PERMISSIONS_TTL,
    },
    throttler: {
      ttl: environment.THROTTLER_TTL,
      limit: environment.THROTTLER_LIMIT,
    },
  };
}

export const configuration = registerAs('application', () =>
  createConfiguration(getValidatedEnvironment()),
);
