import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { ApiConfigService } from '../../shared/services/api-config.service';
import { type AuthenticatedUser } from '../../types/auth-user.type';
import { CacheService } from '../cache/cache.service';
import { UserEntity } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { type AccessTokenClaims, accessTokenClaimsSchema } from './jwt-claims';

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ApiConfigService,
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

  async validate(payload: unknown): Promise<AuthenticatedUser> {
    const claimsResult = accessTokenClaimsSchema.safeParse(payload);

    if (!claimsResult.success) {
      throw new UnauthorizedException('Invalid access token claims');
    }

    const claims = claimsResult.data;
    let userCacheKey: string | undefined;

    try {
      userCacheKey = await this.cacheService.resolveUserKey(claims.sub);
      const cachedJsonUser = await this.cacheService.get(userCacheKey);

      if (cachedJsonUser) {
        try {
          const plainUser: unknown = JSON.parse(cachedJsonUser);

          return this.createPrincipal(
            plainToInstance(UserEntity, plainUser),
            claims,
          );
        } catch (error: unknown) {
          this.logger.error(
            `Error deserializing cached user ${claims.sub}: ${formatError(error)}. Proceeding to DB lookup.`,
          );
        }
      }
    } catch (error: unknown) {
      this.logger.error(
        `Error fetching user ${claims.sub} from cache: ${formatError(error)}. Proceeding to DB lookup.`,
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

    if (userCacheKey) {
      try {
        await this.cacheService.insert(
          userCacheKey,
          JSON.stringify(user),
          this.configService.cacheConfig.userPermissionsTtl,
        );
      } catch (error: unknown) {
        this.logger.error(
          `Failed to cache user ${claims.sub}: ${formatError(error)}`,
        );
      }
    }

    return this.createPrincipal(user, claims);
  }

  private createPrincipal(
    user: UserEntity,
    claims: AccessTokenClaims,
  ): AuthenticatedUser {
    return Object.assign(user, {
      authentication: {
        accessTokenId: claims.jti,
        sessionId: claims.sid,
      },
    }) as AuthenticatedUser;
  }
}
