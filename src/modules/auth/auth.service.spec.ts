import { createHash } from 'node:crypto';

import { UnauthorizedException } from '@nestjs/common';
import { type JwtService } from '@nestjs/jwt';

import { TokenType } from '../../constants';
import { type ApiConfigService } from '../../shared/services/api-config.service';
import { type Uuid } from '../../types';
import { type CacheService } from '../cache/cache.service';
import { type RoleEntity } from '../iam/entities/role.entity';
import { type UserLifecycleService } from '../iam/user-lifecycle.service';
import { AccountStatus } from '../user/account-status.enum';
import { type AccountAccessStateService } from '../user/account-access-state.service';
import { type UserService } from '../user/user.service';
import { AuthService } from './auth.service';

interface IJwtServiceMock {
  signAsync: jest.Mock;
  verifyAsync: jest.Mock;
}

interface ICacheServiceMock {
  storeRefreshToken: jest.Mock;
  rotateRefreshToken: jest.Mock;
  revokeSession: jest.Mock;
  revokeUserSessions: jest.Mock;
}

describe('AuthService', () => {
  const userId = '57f9af62-eabc-4ee8-9a1c-b010a51ae31e' as Uuid;
  const role = { name: 'user' } as RoleEntity;
  const currentClaims = {
    sub: userId,
    jti: '0428b4df-e191-4c0d-b5aa-95cc43eab8aa',
    sid: 'ab8f0de7-91ee-4994-b811-79651e28217a',
    sv: 1,
    iss: 'awesome-nest-boilerplate-test',
    aud: 'awesome-nest-api-test',
    iat: 1_700_000_000,
    exp: 1_700_604_800,
    type: TokenType.REFRESH_TOKEN,
  };

  let service: AuthService;
  let jwtService: IJwtServiceMock;
  let cacheService: ICacheServiceMock;
  let userService: { findOne: jest.Mock };
  let accountAccessStateService: { requireActive: jest.Mock };
  let userLifecycleService: {
    revokeOwnSessions: jest.Mock;
    changePassword: jest.Mock;
  };

  beforeEach(() => {
    jwtService = {
      signAsync: jest
        .fn()
        .mockImplementation((payload: { type: TokenType }) =>
          Promise.resolve(
            payload.type === TokenType.ACCESS_TOKEN
              ? 'signed-access-token'
              : 'signed-refresh-token',
          ),
        ),
      verifyAsync: jest.fn().mockResolvedValue(currentClaims),
    };
    cacheService = {
      storeRefreshToken: jest.fn().mockResolvedValue(undefined),
      rotateRefreshToken: jest.fn().mockResolvedValue(true),
      revokeSession: jest.fn().mockResolvedValue(undefined),
      revokeUserSessions: jest.fn().mockResolvedValue(undefined),
    };
    userService = {
      findOne: jest.fn().mockResolvedValue({
        id: userId,
        roles: [role],
        status: AccountStatus.ACTIVE,
      }),
    };
    accountAccessStateService = {
      requireActive: jest.fn().mockResolvedValue({
        id: userId,
        status: AccountStatus.ACTIVE,
        authorizationRevision: 1,
        sessionVersion: 1,
      }),
    };
    userLifecycleService = {
      revokeOwnSessions: jest.fn().mockResolvedValue(undefined),
      changePassword: jest.fn().mockResolvedValue(undefined),
    };
    const configService = {
      authConfig: {
        issuer: 'awesome-nest-boilerplate-test',
        audience: 'awesome-nest-api-test',
        jwtExpirationTime: 900,
        jwtRefreshExpirationTime: 604_800,
      },
    } as ApiConfigService;

    service = new AuthService(
      jwtService as unknown as JwtService,
      configService,
      userService as unknown as UserService,
      cacheService as unknown as CacheService,
      accountAccessStateService as unknown as AccountAccessStateService,
      userLifecycleService as unknown as UserLifecycleService,
    );
  });

  it('creates a new refresh-token family for login', async () => {
    const tokens = await service.createTokens({
      userId,
      roles: [role],
      sessionVersion: 1,
    });

    expect(tokens).toMatchObject({
      accessToken: 'signed-access-token',
      refreshToken: 'signed-refresh-token',
      expiresIn: 900,
    });
    expect(cacheService.storeRefreshToken).toHaveBeenCalledWith(
      userId,
      expect.any(String),
      expect.any(String),
      createHash('sha256').update('signed-refresh-token').digest('hex'),
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: userId,
        jti: expect.any(String),
        sid: expect.any(String),
        sv: 1,
        type: TokenType.ACCESS_TOKEN,
        roles: ['user'],
      }),
      { expiresIn: 900 },
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: userId,
        jti: expect.any(String),
        sid: expect.any(String),
        sv: 1,
        type: TokenType.REFRESH_TOKEN,
      }),
      { expiresIn: 604_800 },
    );
  });

  it('atomically rotates a valid refresh token in the same family', async () => {
    const tokens = await service.refreshAccessToken('current-refresh-token');

    expect(userService.findOne).toHaveBeenCalledWith({
      where: { id: userId },
      relations: { roles: true },
    });
    expect(accountAccessStateService.requireActive).toHaveBeenCalledWith(
      userId,
      1,
    );
    expect(cacheService.rotateRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        familyId: currentClaims.sid,
        currentTokenId: currentClaims.jti,
        currentTokenHash: createHash('sha256')
          .update('current-refresh-token')
          .digest('hex'),
      }),
    );
    expect(tokens.refreshToken).toBe('signed-refresh-token');
  });

  it('revokes the family when a consumed refresh token is replayed', async () => {
    cacheService.rotateRefreshToken.mockResolvedValue(false);

    await expect(
      service.refreshAccessToken('replayed-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(cacheService.revokeSession).toHaveBeenCalledWith(
      userId,
      currentClaims.sid,
    );
  });

  it('best-effort revokes a family when its durable session version is stale', async () => {
    accountAccessStateService.requireActive.mockRejectedValue(
      new UnauthorizedException(),
    );

    await expect(
      service.refreshAccessToken('stale-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(cacheService.revokeSession).toHaveBeenCalledWith(
      userId,
      currentClaims.sid,
    );
    expect(cacheService.rotateRefreshToken).not.toHaveBeenCalled();
  });

  it('rejects logout when the refresh token belongs to another user', async () => {
    const authenticatedUserId = 'f3f1c524-5de4-489f-b62e-f337008169bb' as Uuid;

    await expect(
      service.logout(authenticatedUserId, currentClaims.sid, 'refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(cacheService.revokeSession).not.toHaveBeenCalled();
  });

  it('rejects logout when the refresh token belongs to another session', async () => {
    await expect(
      service.logout(
        userId,
        'c1b9d793-d410-4e4c-ada1-e55e0a837a73',
        'refresh-token',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(cacheService.revokeSession).not.toHaveBeenCalled();
  });

  it('revokes the complete refresh-token family on logout', async () => {
    await service.logout(userId, currentClaims.sid, 'refresh-token');

    expect(cacheService.revokeSession).toHaveBeenCalledWith(
      userId,
      currentClaims.sid,
    );
  });

  it('revokes every session owned by a user', async () => {
    const correlationId = '019f5ce3-cccb-7631-a9a1-cbacc12fb192' as Uuid;

    await service.logoutAll(userId, correlationId);

    expect(userLifecycleService.revokeOwnSessions).toHaveBeenCalledWith(
      userId,
      correlationId,
    );
  });

  it('rejects malformed refresh-token claims', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: userId,
      type: TokenType.ACCESS_TOKEN,
    });

    await expect(
      service.refreshAccessToken('invalid-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(userService.findOne).not.toHaveBeenCalled();
  });
});
