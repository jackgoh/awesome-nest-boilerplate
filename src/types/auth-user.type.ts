import { type Permission } from '../constants/permissions.enum';
import { type AccessTokenClaims } from '../modules/auth/jwt-claims';
import type { UserEntity } from '../modules/user/user.entity';

export type AuthenticatedUser = UserEntity & {
  authentication: {
    accessTokenId: AccessTokenClaims['jti'];
    sessionId: AccessTokenClaims['sid'];
  };
  computedPermissions: Array<Permission | string>;
};
