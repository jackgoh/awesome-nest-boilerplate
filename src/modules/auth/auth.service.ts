import { createHash } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { generateUuid } from '../../common/uuid';
import { validateHash } from '../../common/utils';
import { TokenType } from '../../constants';
import { ApiConfigService } from '../../shared/services/api-config.service';
import { CacheService } from '../cache/cache.service';
import { type RoleEntity } from '../iam/entities/role.entity';
import { UserLifecycleService } from '../iam/user-lifecycle.service';
import { AccountStatus } from '../user/account-status.enum';
import { AccountAccessStateService } from '../user/account-access-state.service';
import { type UserEntity } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { TokenPayloadDto } from './dto/token-payload.dto';
import { type UserLoginDto } from './dto/user-login.dto';
import { refreshTokenClaimsSchema } from './jwt-claims';

interface ITokenSubject {
  userId: Uuid;
  roles: RoleEntity[];
  sessionVersion: number;
}

interface ISignedTokens {
  tokenId: string;
  tokens: TokenPayloadDto;
}

function hashRefreshToken(refreshToken: string): string {
  return createHash('sha256').update(refreshToken).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ApiConfigService,
    private userService: UserService,
    private cacheService: CacheService,
    private accountAccessStateService: AccountAccessStateService,
    private userLifecycleService: UserLifecycleService,
  ) {}

  async createTokens(data: ITokenSubject): Promise<TokenPayloadDto> {
    const familyId = generateUuid();
    const signedTokens = await this.signTokens(data, familyId);
    const refreshTokenHash = hashRefreshToken(signedTokens.tokens.refreshToken);

    await this.cacheService.storeRefreshToken(
      data.userId,
      familyId,
      signedTokens.tokenId,
      refreshTokenHash,
    );

    return signedTokens.tokens;
  }

  private async signTokens(
    data: ITokenSubject,
    familyId: string,
  ): Promise<ISignedTokens> {
    const tokenId = generateUuid();
    const accessTokenId = generateUuid();
    const roleNames = data.roles.map((role) => role.name);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: data.userId,
          jti: accessTokenId,
          sid: familyId,
          sv: data.sessionVersion,
          type: TokenType.ACCESS_TOKEN,
          roles: roleNames,
        },
        {
          expiresIn: this.configService.authConfig.jwtExpirationTime,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: data.userId,
          jti: tokenId,
          sid: familyId,
          sv: data.sessionVersion,
          type: TokenType.REFRESH_TOKEN,
        },
        {
          expiresIn: this.configService.authConfig.jwtRefreshExpirationTime,
        },
      ),
    ]);

    return {
      tokenId,
      tokens: new TokenPayloadDto({
        expiresIn: this.configService.authConfig.jwtExpirationTime,
        accessToken,
        refreshToken,
      }),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenPayloadDto> {
    let payload: unknown;

    try {
      payload = await this.jwtService.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const claimsResult = refreshTokenClaimsSchema.safeParse(payload);

    if (!claimsResult.success) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const claims = claimsResult.data;

    try {
      await this.accountAccessStateService.requireActive(claims.sub, claims.sv);
    } catch {
      await this.cacheService
        .revokeSession(claims.sub, claims.sid)
        .catch(() => undefined);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userService.findOne({
      where: { id: claims.sub },
      relations: { roles: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const replacement = await this.signTokens(
      {
        userId: user.id,
        roles: user.roles,
        sessionVersion: claims.sv,
      },
      claims.sid,
    );
    const isRotated = await this.cacheService.rotateRefreshToken({
      userId: claims.sub,
      familyId: claims.sid,
      currentTokenId: claims.jti,
      currentTokenHash: hashRefreshToken(refreshToken),
      replacementTokenId: replacement.tokenId,
      replacementTokenHash: hashRefreshToken(replacement.tokens.refreshToken),
    });

    if (!isRotated) {
      await this.cacheService.revokeSession(claims.sub, claims.sid);

      throw new UnauthorizedException('Invalid refresh token');
    }

    return replacement.tokens;
  }

  async validateUser(userLoginDto: UserLoginDto): Promise<UserEntity> {
    const user = await this.userService.findOne({
      where: { email: userLoginDto.email },
      relations: { roles: true },
    });

    if (!user || user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await validateHash(
      userLoginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async logout(userId: Uuid, sessionId: string, token: string): Promise<void> {
    let payload: unknown;

    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const claimsResult = refreshTokenClaimsSchema.safeParse(payload);

    if (
      !claimsResult.success ||
      claimsResult.data.sub !== userId ||
      claimsResult.data.sid !== sessionId
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const claims = claimsResult.data;

    await this.cacheService.revokeSession(claims.sub, claims.sid);
  }

  logoutAll(userId: Uuid, correlationId: Uuid): Promise<void> {
    return this.userLifecycleService.revokeOwnSessions(userId, correlationId);
  }

  changePassword(
    userId: Uuid,
    currentPassword: string,
    newPassword: string,
    correlationId: Uuid,
  ): Promise<void> {
    return this.userLifecycleService.changePassword(
      userId,
      currentPassword,
      newPassword,
      correlationId,
    );
  }
}
