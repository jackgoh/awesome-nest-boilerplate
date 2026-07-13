import { Logger } from '@nestjs/common';
import { type Redis } from 'ioredis';

import { type ApiConfigService } from '../../shared/services/api-config.service';
import { type Uuid } from '../../types';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  const userId = '57f9af62-eabc-4ee8-9a1c-b010a51ae31e' as Uuid;
  let redis: {
    set: jest.Mock;
    get: jest.Mock;
    exists: jest.Mock;
    incr: jest.Mock;
    eval: jest.Mock;
    multi: jest.Mock;
  };
  let transaction: {
    set: jest.Mock;
    sadd: jest.Mock;
    expire: jest.Mock;
    zadd: jest.Mock;
    zremrangebyscore: jest.Mock;
    exec: jest.Mock;
  };
  let service: CacheService;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    transaction = {
      set: jest.fn(),
      sadd: jest.fn(),
      expire: jest.fn(),
      zadd: jest.fn(),
      zremrangebyscore: jest.fn(),
      exec: jest.fn().mockResolvedValue([]),
    };
    transaction.set.mockReturnValue(transaction);
    transaction.sadd.mockReturnValue(transaction);
    transaction.expire.mockReturnValue(transaction);
    transaction.zadd.mockReturnValue(transaction);
    transaction.zremrangebyscore.mockReturnValue(transaction);
    redis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      exists: jest.fn().mockResolvedValue(0),
      incr: jest.fn().mockResolvedValue(1),
      eval: jest.fn().mockResolvedValue(1),
      multi: jest.fn().mockReturnValue(transaction),
    };
    const configService = {
      authConfig: {
        jwtExpirationTime: 900,
        jwtRefreshExpirationTime: 604_800,
      },
    } as ApiConfigService;

    service = new CacheService(redis as unknown as Redis, configService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('never includes cached credential values in debug logs', async () => {
    const debug = jest
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => undefined);

    await service.insert('r_token:user:token', 'sensitive-token-hash', 60);

    expect(debug).toHaveBeenCalledWith(
      'Inserting cache key: r_token:user:token',
    );
    expect(JSON.stringify(debug.mock.calls)).not.toContain(
      'sensitive-token-hash',
    );
  });

  it('stores a refresh token and its family index in one transaction', async () => {
    await service.storeRefreshToken(
      userId,
      'family-id',
      'token-id',
      'token-hash',
    );

    expect(transaction.set).toHaveBeenCalledWith(
      `r_token:{${userId}}:session:family-id:token:token-id`,
      'token-hash',
      'EX',
      604_800,
    );
    expect(transaction.sadd).toHaveBeenCalledWith(
      `r_family:{${userId}}:session:family-id`,
      `r_token:{${userId}}:session:family-id:token:token-id`,
    );
    expect(transaction.zremrangebyscore).toHaveBeenCalledWith(
      `r_sessions:{${userId}}`,
      '-inf',
      1_700_000_000,
    );
    expect(transaction.zadd).toHaveBeenCalledWith(
      `r_sessions:{${userId}}`,
      1_700_604_800,
      'family-id',
    );
    expect(transaction.exec).toHaveBeenCalledTimes(1);
  });

  it('rotates refresh tokens through one atomic Redis script', async () => {
    await expect(
      service.rotateRefreshToken({
        userId,
        familyId: 'family-id',
        currentTokenId: 'current-id',
        currentTokenHash: 'current-hash',
        replacementTokenId: 'replacement-id',
        replacementTokenHash: 'replacement-hash',
      }),
    ).resolves.toBe(true);

    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('GET', KEYS[1])"),
      4,
      `r_token:{${userId}}:session:family-id:token:current-id`,
      `r_token:{${userId}}:session:family-id:token:replacement-id`,
      `r_family:{${userId}}:session:family-id`,
      `r_sessions:{${userId}}`,
      'current-hash',
      'replacement-hash',
      '604800',
      'family-id',
      '1700604800',
      '1700000000',
    );
  });

  it('atomically revokes a session and blacklists its access tokens', async () => {
    await service.revokeSession(userId, 'family-id');

    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('SMEMBERS', KEYS[1])"),
      3,
      `r_family:{${userId}}:session:family-id`,
      `r_sessions:{${userId}}`,
      `a_blacklist:{${userId}}:session:family-id`,
      'family-id',
      '604800',
      '1700000000',
    );
  });

  it('atomically revokes and blacklists every active user session', async () => {
    await service.revokeUserSessions(userId);

    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining("'WITHSCORES'"),
      1,
      `r_sessions:{${userId}}`,
      userId,
      '1700000000',
    );
  });

  it('checks the session blacklist without reading token contents', async () => {
    redis.exists.mockResolvedValue(1);

    await expect(
      service.isSessionBlacklisted(userId, 'family-id'),
    ).resolves.toBe(true);
    expect(redis.exists).toHaveBeenCalledWith(
      `a_blacklist:{${userId}}:session:family-id`,
    );
  });
});
