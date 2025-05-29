import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UserNotFoundException } from '@/exceptions';
import { Request } from 'express';
import { TokenType, type RoleType } from '../../constants';
import { ApiConfigService } from '../../shared/services/api-config.service';
import { UserEntity } from '../user-v2/user.entity';
import { UserService } from '../user-v2/user.service';
import { AuthService } from './auth.service';
import { JWTExpiredException } from './exceptions/jwt-expired.exception';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ApiConfigService,
    private userService: UserService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.authConfig.publicKey,
      passReqToCallback: true,
    });
  }

  async validate(
    request: Request,
    args: {
      userId: Uuid;
      role: RoleType;
      type: TokenType;
    },
  ): Promise<UserEntity> {
    // check access token type
    if (args.type !== TokenType.ACCESS_TOKEN) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.findOne({
      // FIXME: issue with type casts
      id: args.userId as never,
      role: args.role,
    });

    // check valid user
    if (!user) {
      throw new UserNotFoundException();
    }

    // check token revocation
    if (await this.authService.isTokenRevoked(user.wallet_address, request)) {
      throw new JWTExpiredException();
    }

    return user;
  }
}
