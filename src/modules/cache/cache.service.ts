import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

import { ApiConfigService } from '../../shared/services/api-config.service';
import { IO_REDIS_KEY } from './redis.constants';

const ROTATE_REFRESH_TOKEN_SCRIPT = `
local currentHash = redis.call('GET', KEYS[1])

if not currentHash or currentHash ~= ARGV[1] then
  return 0
end

redis.call('DEL', KEYS[1])
redis.call('SREM', KEYS[3], KEYS[1])
redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
redis.call('SADD', KEYS[3], KEYS[2])
redis.call('EXPIRE', KEYS[3], ARGV[3])

return 1
`;

const REVOKE_REFRESH_TOKEN_FAMILY_SCRIPT = `
local tokenKeys = redis.call('SMEMBERS', KEYS[1])

if #tokenKeys > 0 then
  redis.call('DEL', unpack(tokenKeys))
end

redis.call('DEL', KEYS[1])

return #tokenKeys
`;

export function getUserAuthorizationVersionKey(userId: Uuid): string {
  return `user:{${userId}}:authz-version`;
}

export async function invalidateUserAuthorizationVersions(
  redisClient: Pick<Redis, 'incr'>,
  userIds: Uuid[],
): Promise<void> {
  const uniqueUserIds = [...new Set(userIds)];

  await Promise.all(
    uniqueUserIds.map((userId) =>
      redisClient.incr(getUserAuthorizationVersionKey(userId)),
    ),
  );
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Inject(IO_REDIS_KEY)
    private readonly redisClient: Redis,
    private readonly configService: ApiConfigService,
  ) {}

  async getKeys(pattern?: string): Promise<string[]> {
    this.logger.debug(`Scanning for keys with pattern: ${pattern ?? '*'}`);
    const stream = this.redisClient.scanStream({
      match: pattern ?? '*',
      count: 100,
    });
    const keys: string[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (resultKeys: string[]) => {
        keys.push(...resultKeys);
      });
      stream.on('error', (err) => {
        this.logger.error(`Error scanning keys: ${err}`);
        reject(err);
      });
      stream.on('end', () => {
        this.logger.debug(
          `Found ${keys.length} keys matching pattern: ${pattern ?? '*'}`,
        );
        resolve(keys);
      });
    });
  }

  async insert(
    key: string,
    value: string | number,
    ttl?: number,
  ): Promise<void> {
    this.logger.debug(`Inserting cache key: ${key}`);

    if (ttl) {
      await this.redisClient.set(key, value, 'EX', ttl);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    this.logger.debug(`Getting key: ${key}`);

    return this.redisClient.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  getUserAuthorizationVersionKey(userId: Uuid): string {
    return getUserAuthorizationVersionKey(userId);
  }

  getUserKey(userId: Uuid, version: string): string {
    return `user:{${userId}}:authz:${version}`;
  }

  async resolveUserKey(userId: Uuid): Promise<string> {
    const version =
      (await this.redisClient.get(
        this.getUserAuthorizationVersionKey(userId),
      )) ?? '0';

    return this.getUserKey(userId, version);
  }

  async invalidateUserAuthorization(userIds: Uuid[]): Promise<void> {
    await invalidateUserAuthorizationVersions(this.redisClient, userIds);
  }

  getRefreshTokenKey(userId: Uuid, familyId: string, tokenId: string): string {
    return `r_token:{${userId}:${familyId}}:${tokenId}`;
  }

  getRefreshTokenFamilyKey(userId: Uuid, familyId: string): string {
    return `r_family:{${userId}:${familyId}}`;
  }

  // Refresh token storage methods
  async storeRefreshToken(
    userId: Uuid,
    familyId: string,
    tokenId: string,
    tokenHash: string,
  ): Promise<void> {
    const tokenKey = this.getRefreshTokenKey(userId, familyId, tokenId);
    const familyKey = this.getRefreshTokenFamilyKey(userId, familyId);
    const ttl = this.configService.authConfig.jwtRefreshExpirationTime;
    const result = await this.redisClient
      .multi()
      .set(tokenKey, tokenHash, 'EX', ttl)
      .sadd(familyKey, tokenKey)
      .expire(familyKey, ttl)
      .exec();

    if (!result) {
      throw new Error('Unable to persist refresh token');
    }
  }

  async rotateRefreshToken(options: {
    userId: Uuid;
    familyId: string;
    currentTokenId: string;
    currentTokenHash: string;
    replacementTokenId: string;
    replacementTokenHash: string;
  }): Promise<boolean> {
    const currentTokenKey = this.getRefreshTokenKey(
      options.userId,
      options.familyId,
      options.currentTokenId,
    );
    const replacementTokenKey = this.getRefreshTokenKey(
      options.userId,
      options.familyId,
      options.replacementTokenId,
    );
    const familyKey = this.getRefreshTokenFamilyKey(
      options.userId,
      options.familyId,
    );
    const ttl = this.configService.authConfig.jwtRefreshExpirationTime;
    const result = await this.redisClient.eval(
      ROTATE_REFRESH_TOKEN_SCRIPT,
      3,
      currentTokenKey,
      replacementTokenKey,
      familyKey,
      options.currentTokenHash,
      options.replacementTokenHash,
      String(ttl),
    );

    return result === 1;
  }

  async revokeRefreshTokenFamily(
    userId: Uuid,
    familyId: string,
  ): Promise<void> {
    const familyKey = this.getRefreshTokenFamilyKey(userId, familyId);
    await this.redisClient.eval(
      REVOKE_REFRESH_TOKEN_FAMILY_SCRIPT,
      1,
      familyKey,
    );
  }
}
