import { createHash } from 'node:crypto';

import { UnauthorizedException } from '@nestjs/common';
import { type JwtService } from '@nestjs/jwt';

import { TokenType } from '../../constants';
import { type ApiConfigService } from '../../shared/services/api-config.service';
import { type Uuid } from '../../types';
import { type CacheService } from '../cache/cache.service';
import { type RoleEntity } from '../iam/entities/role.entity';
import { type UserService } from '../user/user.service';
import { AuthService } from './auth.service';

interface IJwtServiceMock {
  signAsync: jest.Mock;
  verifyAsync: jest.Mock;
}

interface ICacheServiceMock {
  storeRefreshToken: jest.Mock;
  rotateRefreshToken: jest.Mock;
  revokeRefreshTokenFamily: jest.Mock;
}

describe('AuthService', () => {
  const userId = '57f9af62-eabc-4ee8-9a1c-b010a51ae31e' as Uuid;
  const role = { name: 'user' } as RoleEntity;
  const currentClaims = {
    userId,
    type: TokenType.REFRESH_TOKEN,
    tokenId: 'current-token-id',
    familyId: 'refresh-family-id',
  };

  let service: AuthService;
  let jwtService: IJwtServiceMock;
  let cacheService: ICacheServiceMock;
  let userService: { findOne: jest.Mock };

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
      revokeRefreshTokenFamily: jest.fn().mockResolvedValue(undefined),
    };
    userService = {
      findOne: jest.fn().mockResolvedValue({ id: userId, roles: [role] }),
    };
    const configService = {
      authConfig: {
        jwtExpirationTime: 900,
        jwtRefreshExpirationTime: 604_800,
      },
    } as ApiConfigService;

    service = new AuthService(
      jwtService as unknown as JwtService,
      configService,
      userService as unknown as UserService,
      cacheService as unknown as CacheService,
    );
  });

  it('creates a new refresh-token family for login', async () => {
    const tokens = await service.createTokens({ userId, roles: [role] });

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
  });

  it('atomically rotates a valid refresh token in the same family', async () => {
    const tokens = await service.refreshAccessToken('current-refresh-token');

    expect(userService.findOne).toHaveBeenCalledWith({
      where: { id: userId },
      relations: { roles: true },
    });
    expect(cacheService.rotateRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        familyId: currentClaims.familyId,
        currentTokenId: currentClaims.tokenId,
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
    expect(cacheService.revokeRefreshTokenFamily).toHaveBeenCalledWith(
      userId,
      currentClaims.familyId,
    );
  });

  it('rejects logout when the refresh token belongs to another user', async () => {
    const authenticatedUserId = 'f3f1c524-5de4-489f-b62e-f337008169bb' as Uuid;

    await expect(
      service.logout(authenticatedUserId, 'refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(cacheService.revokeRefreshTokenFamily).not.toHaveBeenCalled();
  });

  it('revokes the complete refresh-token family on logout', async () => {
    await service.logout(userId, 'refresh-token');

    expect(cacheService.revokeRefreshTokenFamily).toHaveBeenCalledWith(
      userId,
      currentClaims.familyId,
    );
  });

  it('rejects malformed refresh-token claims', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      userId,
      type: TokenType.ACCESS_TOKEN,
    });

    await expect(
      service.refreshAccessToken('invalid-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(userService.findOne).not.toHaveBeenCalled();
  });
});
