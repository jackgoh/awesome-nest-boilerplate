import { z } from 'zod';

import { TokenType } from '../../constants';
import { type Uuid } from '../../types';

const jwtAudienceSchema = z.union([
  z.string().min(1),
  z.array(z.string().min(1)).min(1),
]);

const registeredClaims = {
  sub: z.uuid().transform((subject) => subject as Uuid),
  jti: z.uuid(),
  sid: z.uuid(),
  sv: z.number().int().positive(),
  iss: z.string().min(1),
  aud: jwtAudienceSchema,
  iat: z.number().int().nonnegative(),
  exp: z.number().int().positive(),
};

export const accessTokenClaimsSchema = z.strictObject({
  ...registeredClaims,
  type: z.literal(TokenType.ACCESS_TOKEN),
  roles: z.array(z.string().min(1)),
});

export const refreshTokenClaimsSchema = z.strictObject({
  ...registeredClaims,
  type: z.literal(TokenType.REFRESH_TOKEN),
});

export type AccessTokenClaims = z.infer<typeof accessTokenClaimsSchema>;
export type RefreshTokenClaims = z.infer<typeof refreshTokenClaimsSchema>;
