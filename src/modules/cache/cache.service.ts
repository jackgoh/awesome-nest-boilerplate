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
redis.call('ZREMRANGEBYSCORE', KEYS[4], '-inf', ARGV[6])
redis.call('ZADD', KEYS[4], ARGV[5], ARGV[4])
redis.call('EXPIRE', KEYS[4], ARGV[3])

return 1
`;

const REVOKE_SESSION_SCRIPT = `
local tokenKeys = redis.call('SMEMBERS', KEYS[1])
local expiresAt = redis.call('ZSCORE', KEYS[2], ARGV[1])
local blacklistTtl = tonumber(ARGV[2])

if expiresAt then
  blacklistTtl = math.max(1, tonumber(expiresAt) - tonumber(ARGV[3]))
end

if #tokenKeys > 0 then
  redis.call('DEL', unpack(tokenKeys))
end

redis.call('DEL', KEYS[1])
redis.call('ZREM', KEYS[2], ARGV[1])

if redis.call('ZCARD', KEYS[2]) == 0 then
  redis.call('DEL', KEYS[2])
end

redis.call('SET', KEYS[3], '1', 'EX', blacklistTtl)

return #tokenKeys
`;

const REVOKE_USER_SESSIONS_SCRIPT = `
local sessions = redis.call(
  'ZRANGEBYSCORE',
  KEYS[1],
  '(' .. ARGV[2],
  '+inf',
  'WITHSCORES'
)

for index = 1, #sessions, 2 do
  local sessionId = sessions[index]
  local expiresAt = tonumber(sessions[index + 1])
  local blacklistTtl = math.max(1, expiresAt - tonumber(ARGV[2]))
  local familyKey = 'r_family:{' .. ARGV[1] .. '}:session:' .. sessionId
  local tokenKeys = redis.call('SMEMBERS', familyKey)

  if #tokenKeys > 0 then
    redis.call('DEL', unpack(tokenKeys))
  end

  redis.call('DEL', familyKey)
  redis.call(
    'SET',
    'a_blacklist:{' .. ARGV[1] .. '}:session:' .. sessionId,
    '1',
    'EX',
    blacklistTtl
  )
end

redis.call('DEL', KEYS[1])

return #sessions / 2
`;

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

  getUserKey(userId: Uuid, version: string): string {
    return `user:{${userId}}:authz:${version}`;
  }

  async deleteUserAuthorizationCache(userId: Uuid): Promise<void> {
    const keys = await this.getKeys(`user:{${userId}}:authz:*`);

    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }

  getRefreshTokenKey(userId: Uuid, familyId: string, tokenId: string): string {
    return `r_token:{${userId}}:session:${familyId}:token:${tokenId}`;
  }

  getRefreshTokenFamilyKey(userId: Uuid, familyId: string): string {
    return `r_family:{${userId}}:session:${familyId}`;
  }

  getUserSessionsKey(userId: Uuid): string {
    return `r_sessions:{${userId}}`;
  }

  getSessionBlacklistKey(userId: Uuid, familyId: string): string {
    return `a_blacklist:{${userId}}:session:${familyId}`;
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
    const sessionsKey = this.getUserSessionsKey(userId);
    const ttl = this.configService.authConfig.jwtRefreshExpirationTime;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + ttl;
    const result = await this.redisClient
      .multi()
      .set(tokenKey, tokenHash, 'EX', ttl)
      .sadd(familyKey, tokenKey)
      .expire(familyKey, ttl)
      .zremrangebyscore(sessionsKey, '-inf', now)
      .zadd(sessionsKey, expiresAt, familyId)
      .expire(sessionsKey, ttl)
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
    const sessionsKey = this.getUserSessionsKey(options.userId);
    const ttl = this.configService.authConfig.jwtRefreshExpirationTime;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + ttl;
    const result = await this.redisClient.eval(
      ROTATE_REFRESH_TOKEN_SCRIPT,
      4,
      currentTokenKey,
      replacementTokenKey,
      familyKey,
      sessionsKey,
      options.currentTokenHash,
      options.replacementTokenHash,
      String(ttl),
      options.familyId,
      String(expiresAt),
      String(now),
    );

    return result === 1;
  }

  async revokeSession(userId: Uuid, familyId: string): Promise<void> {
    const familyKey = this.getRefreshTokenFamilyKey(userId, familyId);
    const sessionsKey = this.getUserSessionsKey(userId);
    const blacklistKey = this.getSessionBlacklistKey(userId, familyId);
    const now = Math.floor(Date.now() / 1000);
    await this.redisClient.eval(
      REVOKE_SESSION_SCRIPT,
      3,
      familyKey,
      sessionsKey,
      blacklistKey,
      familyId,
      String(this.configService.authConfig.jwtRefreshExpirationTime),
      String(now),
    );
  }

  async revokeUserSessions(userId: Uuid): Promise<void> {
    const sessionsKey = this.getUserSessionsKey(userId);
    const now = Math.floor(Date.now() / 1000);
    await this.redisClient.eval(
      REVOKE_USER_SESSIONS_SCRIPT,
      1,
      sessionsKey,
      userId,
      String(now),
    );
  }

  async isSessionBlacklisted(userId: Uuid, familyId: string): Promise<boolean> {
    return (
      (await this.redisClient.exists(
        this.getSessionBlacklistKey(userId, familyId),
      )) === 1
    );
  }
}
