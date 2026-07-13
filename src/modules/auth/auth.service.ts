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

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ApiConfigService,
    private userService: UserService,
    private cacheService: CacheService,
  ) {}

  async createTokens(data: {
    userId: Uuid;
    roles: RoleEntity[];
  }): Promise<TokenPayloadDto> {
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
        },
        {
          expiresIn: this.configService.authConfig.jwtRefreshExpirationTime,
        },
      ),
    ]);

    const refreshTokenHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    await this.cacheService.storeRefreshToken(
      data.userId,
      tokenId,
      refreshTokenHash,
    );

    return new TokenPayloadDto({
      expiresIn: this.configService.authConfig.jwtExpirationTime,
      accessToken,
      refreshToken,
    });
  }

  async createAccessToken(data: {
    userId: Uuid;
    roles: RoleEntity[];
  }): Promise<TokenPayloadDto> {
    return this.createTokens(data);
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenPayloadDto> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);

      if (payload.type !== TokenType.REFRESH_TOKEN) {
        throw new UnauthorizedException('Invalid token type');
      }

      const refreshTokenHash = createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      const isValid = await this.cacheService.validateRefreshToken(
        payload.userId,
        payload.tokenId,
        refreshTokenHash,
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Invalidate old refresh token (token rotation)
      await this.cacheService.invalidateRefreshToken(
        payload.userId,
        payload.tokenId,
      );

      const user = await this.userService.findOne({
        where: { id: payload.userId },
        relations: { roles: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.createTokens({
        userId: user.id,
        roles: user.roles,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
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
    try {
      const payload = await this.jwtService.verifyAsync(token);

      if (payload.type !== TokenType.REFRESH_TOKEN) {
        throw new Error('Invalid token type');
      }

      await this.cacheService.invalidateRefreshToken(userId, payload.tokenId);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
