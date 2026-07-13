import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { TokenType } from '../../constants';
import { ApiConfigService } from '../../shared/services/api-config.service';
import { type Uuid } from '../../types';
import { CacheService } from '../cache/cache.service';
import { UserEntity } from '../user/user.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ApiConfigService,
    private userService: UserService,
    private cacheService: CacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request) => {
          if (request.cookies.accessToken) {
            return request.cookies.accessToken;
          }

          return null;
        },
      ]),
      secretOrKey: configService.authConfig.publicKey,
    });
  }

  async validate(payload: {
    userId: Uuid;
    type: TokenType;
  }): Promise<UserEntity> {
    if (payload.type !== TokenType.ACCESS_TOKEN) {
      throw new UnauthorizedException('Invalid token type');
    }

    const userCacheKey = this.cacheService.getUserKey(payload.userId);

    try {
      const cachedJsonUser = await this.cacheService.get(userCacheKey);

      if (cachedJsonUser) {
        try {
          const plainUser = JSON.parse(cachedJsonUser);

          return plainToInstance(UserEntity, plainUser);
        } catch (e) {
          this.logger.error(
            `Error deserializing cached user ${payload.userId}: ${e}. Proceeding to DB lookup.`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error fetching user ${payload.userId} from cache: ${error}. Proceeding to DB lookup.`,
      );
    }

    const user = await this.userService.findOne({
      where: { id: payload.userId },
      relations: {
        roles: { permissions: true },
        directPermissions: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: {
          id: true,
          name: true,
          permissions: {
            id: true,
            name: true,
          },
        },
        directPermissions: {
          id: true,
          name: true,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    try {
      await this.cacheService.insert(userCacheKey, JSON.stringify(user), 300);
    } catch (cacheError) {
      this.logger.error(
        `Failed to cache user ${payload.userId}: ${cacheError}`,
      );
    }

    return user;
  }
}
