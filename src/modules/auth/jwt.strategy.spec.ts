import { UnauthorizedException } from '@nestjs/common';

import { TokenType } from '../../constants';
import { type ApiConfigService } from '../../shared/services/api-config.service';
import { type Uuid } from '../../types';
import { type CacheService } from '../cache/cache.service';
import { AccountStatus } from '../user/account-status.enum';
import { type AccountAccessStateService } from '../user/account-access-state.service';
import { type UserService } from '../user/user.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const userId = '57f9af62-eabc-4ee8-9a1c-b010a51ae31e' as Uuid;
  const claims = {
    sub: userId,
    jti: '0428b4df-e191-4c0d-b5aa-95cc43eab8aa',
    sid: 'ab8f0de7-91ee-4994-b811-79651e28217a',
    sv: 1,
    iss: 'awesome-nest-boilerplate-test',
    aud: 'awesome-nest-api-test',
    iat: 1_700_000_000,
    exp: 1_700_000_900,
    type: TokenType.ACCESS_TOKEN,
    roles: ['user'],
  };

  let cacheService: {
    isSessionBlacklisted: jest.Mock;
    getUserKey: jest.Mock;
    get: jest.Mock;
    insert: jest.Mock;
  };
  let userService: { findOne: jest.Mock };
  let accountAccessStateService: { requireActive: jest.Mock };
  let strategy: JwtStrategy;

  beforeEach(() => {
    cacheService = {
      isSessionBlacklisted: jest.fn().mockResolvedValue(false),
      getUserKey: jest.fn().mockReturnValue(`user:{${userId}}:authz:7`),
      get: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockResolvedValue(undefined),
    };
    userService = {
      findOne: jest.fn().mockResolvedValue({
        id: userId,
        email: 'user@example.com',
        roles: [],
        directPermissions: [],
        computedPermissions: [],
      }),
    };
    accountAccessStateService = {
      requireActive: jest.fn().mockResolvedValue({
        id: userId,
        status: AccountStatus.ACTIVE,
        authorizationRevision: 7,
        sessionVersion: 1,
      }),
    };
    const configService = {
      authConfig: {
        publicKey: 'test-public-key',
        issuer: claims.iss,
        audience: claims.aud,
      },
      cacheConfig: { userPermissionsTtl: 120 },
    } as ApiConfigService;

    strategy = new JwtStrategy(
      configService,
      userService as unknown as UserService,
      cacheService as unknown as CacheService,
      accountAccessStateService as unknown as AccountAccessStateService,
    );
  });

  it('attaches the access-token session after caching the user', async () => {
    const principal = await strategy.validate(claims);

    expect(principal.authentication).toEqual({
      accessTokenId: claims.jti,
      sessionId: claims.sid,
    });
    const cachedUser = JSON.parse(cacheService.insert.mock.calls[0][1]);

    expect(cachedUser).not.toHaveProperty('authentication');
    expect(cacheService.insert).toHaveBeenCalledWith(
      `user:{${userId}}:authz:7`,
      expect.any(String),
      120,
    );
  });

  it('overwrites stale session metadata on a cache hit', async () => {
    cacheService.get.mockResolvedValue(
      JSON.stringify({
        id: userId,
        authentication: {
          accessTokenId: 'stale-token-id',
          sessionId: 'stale-session-id',
        },
      }),
    );

    const principal = await strategy.validate(claims);

    expect(principal.authentication).toEqual({
      accessTokenId: claims.jti,
      sessionId: claims.sid,
    });
    expect(userService.findOne).not.toHaveBeenCalled();
  });

  it('rejects access tokens from a blacklisted session', async () => {
    cacheService.isSessionBlacklisted.mockResolvedValue(true);

    await expect(strategy.validate(claims)).rejects.toThrow(
      'Access token has been revoked',
    );
    expect(accountAccessStateService.requireActive).not.toHaveBeenCalled();
    expect(userService.findOne).not.toHaveBeenCalled();
  });

  it('fails closed when Redis cannot verify session revocation', async () => {
    cacheService.isSessionBlacklisted.mockRejectedValue(
      new Error('Redis offline'),
    );

    await expect(strategy.validate(claims)).rejects.toThrow(
      'Token revocation service unavailable',
    );
    expect(userService.findOne).not.toHaveBeenCalled();
  });

  it('falls back to the database when the authorization cache is unavailable', async () => {
    cacheService.get.mockRejectedValue(new Error('Redis offline'));

    const principal = await strategy.validate(claims);

    expect(principal.id).toBe(userId);
    expect(userService.findOne).toHaveBeenCalled();
    expect(cacheService.insert).toHaveBeenCalled();
  });

  it('rejects access claims without a session identifier', async () => {
    const claimsWithoutSession = { ...claims };

    delete (claimsWithoutSession as Partial<typeof claims>).sid;

    await expect(
      strategy.validate(claimsWithoutSession),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(cacheService.isSessionBlacklisted).not.toHaveBeenCalled();
    expect(cacheService.get).not.toHaveBeenCalled();
  });
});
