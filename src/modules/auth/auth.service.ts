import { createHash, randomUUID } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { validateHash } from '../../common/utils';
import { TokenType } from '../../constants';
import { ApiConfigService } from '../../shared/services/api-config.service';
import { CacheService } from '../cache/cache.service';
import { type RoleEntity } from '../iam/entities/role.entity';
import { type UserEntity } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { TokenPayloadDto } from './dto/token-payload.dto';
import { type UserLoginDto } from './dto/user-login.dto';

interface ITokenSubject {
  userId: Uuid;
  roles: RoleEntity[];
}

interface IRefreshTokenClaims {
  userId: Uuid;
  type: TokenType;
  tokenId: string;
  familyId: string;
}

interface ISignedTokens {
  tokenId: string;
  tokens: TokenPayloadDto;
}

function hashRefreshToken(refreshToken: string): string {
  return createHash('sha256').update(refreshToken).digest('hex');
}

function isRefreshTokenClaims(
  payload: unknown,
): payload is IRefreshTokenClaims {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const claims = payload as Partial<IRefreshTokenClaims>;

  return (
    claims.type === TokenType.REFRESH_TOKEN &&
    typeof claims.userId === 'string' &&
    typeof claims.tokenId === 'string' &&
    typeof claims.familyId === 'string'
  );
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ApiConfigService,
    private userService: UserService,
    private cacheService: CacheService,
  ) {}

  async createTokens(data: ITokenSubject): Promise<TokenPayloadDto> {
    const familyId = randomUUID();
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
    const tokenId = randomUUID();
    const roleNames = data.roles.map((role) => role.name);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          userId: data.userId,
          type: TokenType.ACCESS_TOKEN,
          roles: roleNames,
        },
        {
          expiresIn: this.configService.authConfig.jwtExpirationTime,
        },
      ),
      this.jwtService.signAsync(
        {
          userId: data.userId,
          type: TokenType.REFRESH_TOKEN,
          tokenId,
          familyId,
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

    if (!isRefreshTokenClaims(payload)) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userService.findOne({
      where: { id: payload.userId },
      relations: { roles: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const replacement = await this.signTokens(
      { userId: user.id, roles: user.roles },
      payload.familyId,
    );
    const isRotated = await this.cacheService.rotateRefreshToken({
      userId: payload.userId,
      familyId: payload.familyId,
      currentTokenId: payload.tokenId,
      currentTokenHash: hashRefreshToken(refreshToken),
      replacementTokenId: replacement.tokenId,
      replacementTokenHash: hashRefreshToken(replacement.tokens.refreshToken),
    });

    if (!isRotated) {
      await this.cacheService.revokeRefreshTokenFamily(
        payload.userId,
        payload.familyId,
      );

      throw new UnauthorizedException('Invalid refresh token');
    }

    return replacement.tokens;
  }

  async validateUser(userLoginDto: UserLoginDto): Promise<UserEntity> {
    const user = await this.userService.findOne({
      where: { email: userLoginDto.email },
      relations: { roles: true },
    });

    if (!user) {
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

  async logout(userId: Uuid, token: string): Promise<void> {
    let payload: unknown;

    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!isRefreshTokenClaims(payload) || payload.userId !== userId) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.cacheService.revokeRefreshTokenFamily(
      payload.userId,
      payload.familyId,
    );
  }
}
