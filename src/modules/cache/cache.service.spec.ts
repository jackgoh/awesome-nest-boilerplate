import { Logger } from '@nestjs/common';
import { type Redis } from 'ioredis';

import { type ApiConfigService } from '../../shared/services/api-config.service';
import { type Uuid } from '../../types';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  const userId = '57f9af62-eabc-4ee8-9a1c-b010a51ae31e' as Uuid;
  let redis: {
    set: jest.Mock;
    eval: jest.Mock;
    multi: jest.Mock;
  };
  let transaction: {
    set: jest.Mock;
    sadd: jest.Mock;
    expire: jest.Mock;
    exec: jest.Mock;
  };
  let service: CacheService;

  beforeEach(() => {
    transaction = {
      set: jest.fn(),
      sadd: jest.fn(),
      expire: jest.fn(),
      exec: jest.fn().mockResolvedValue([]),
    };
    transaction.set.mockReturnValue(transaction);
    transaction.sadd.mockReturnValue(transaction);
    transaction.expire.mockReturnValue(transaction);
    redis = {
      set: jest.fn().mockResolvedValue('OK'),
      eval: jest.fn().mockResolvedValue(1),
      multi: jest.fn().mockReturnValue(transaction),
    };
    const configService = {
      authConfig: { jwtRefreshExpirationTime: 604_800 },
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
      `r_token:{${userId}:family-id}:token-id`,
      'token-hash',
      'EX',
      604_800,
    );
    expect(transaction.sadd).toHaveBeenCalledWith(
      `r_family:{${userId}:family-id}`,
      `r_token:{${userId}:family-id}:token-id`,
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
      3,
      `r_token:{${userId}:family-id}:current-id`,
      `r_token:{${userId}:family-id}:replacement-id`,
      `r_family:{${userId}:family-id}`,
      'current-hash',
      'replacement-hash',
      '604800',
    );
  });

  it('atomically deletes every active token in a refresh family', async () => {
    await service.revokeRefreshTokenFamily(userId, 'family-id');

    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('SMEMBERS', KEYS[1])"),
      1,
      `r_family:{${userId}:family-id}`,
    );
  });
});
