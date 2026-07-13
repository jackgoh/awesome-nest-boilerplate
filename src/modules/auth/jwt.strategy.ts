import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { ApiConfigService } from '../../shared/services/api-config.service';
import { CacheService } from '../cache/cache.service';
import { UserEntity } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { accessTokenClaimsSchema } from './jwt-claims';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ApiConfigService,
    private userService: UserService,
    private cacheService: CacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.authConfig.publicKey,
      algorithms: ['RS256'],
      issuer: configService.authConfig.issuer,
      audience: configService.authConfig.audience,
    });
  }

  async validate(payload: unknown): Promise<UserEntity> {
    const claimsResult = accessTokenClaimsSchema.safeParse(payload);

    if (!claimsResult.success) {
      throw new UnauthorizedException('Invalid access token claims');
    }

    const claims = claimsResult.data;

    const userCacheKey = this.cacheService.getUserKey(claims.sub);

    try {
      const cachedJsonUser = await this.cacheService.get(userCacheKey);

      if (cachedJsonUser) {
        try {
          const plainUser = JSON.parse(cachedJsonUser);

          return plainToInstance(UserEntity, plainUser);
        } catch (e) {
          this.logger.error(
            `Error deserializing cached user ${claims.sub}: ${e}. Proceeding to DB lookup.`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error fetching user ${claims.sub} from cache: ${error}. Proceeding to DB lookup.`,
      );
    }

    const user = await this.userService.findOne({
      where: { id: claims.sub },
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
      this.logger.error(`Failed to cache user ${claims.sub}: ${cacheError}`);
    }

    return user;
  }
}
