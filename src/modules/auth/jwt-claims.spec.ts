import { TokenType } from '../../constants';
import {
  accessTokenClaimsSchema,
  refreshTokenClaimsSchema,
} from './jwt-claims';

const registeredClaims = {
  sub: '57f9af62-eabc-4ee8-9a1c-b010a51ae31e',
  jti: '0428b4df-e191-4c0d-b5aa-95cc43eab8aa',
  sid: 'ab8f0de7-91ee-4994-b811-79651e28217a',
  sv: 1,
  iss: 'awesome-nest-boilerplate-test',
  aud: 'awesome-nest-api-test',
  iat: 1_700_000_000,
  exp: 1_700_000_900,
};

describe('JWT claim schemas', () => {
  it('accepts a complete access-token contract', () => {
    expect(
      accessTokenClaimsSchema.parse({
        ...registeredClaims,
        type: TokenType.ACCESS_TOKEN,
        roles: ['user'],
      }),
    ).toMatchObject(registeredClaims);
  });

  it('accepts a complete refresh-token contract', () => {
    expect(
      refreshTokenClaimsSchema.parse({
        ...registeredClaims,
        type: TokenType.REFRESH_TOKEN,
      }),
    ).toMatchObject(registeredClaims);
  });

  it('rejects missing registered claims and unknown properties', () => {
    const missingJti = {
      sub: registeredClaims.sub,
      sid: registeredClaims.sid,
      iss: registeredClaims.iss,
      aud: registeredClaims.aud,
      iat: registeredClaims.iat,
      exp: registeredClaims.exp,
    };

    expect(
      refreshTokenClaimsSchema.safeParse({
        ...missingJti,
        type: TokenType.REFRESH_TOKEN,
      }).success,
    ).toBe(false);
    expect(
      refreshTokenClaimsSchema.safeParse({
        ...registeredClaims,
        type: TokenType.REFRESH_TOKEN,
        unexpected: true,
      }).success,
    ).toBe(false);
  });

  it('does not allow access and refresh token types to be interchanged', () => {
    expect(
      accessTokenClaimsSchema.safeParse({
        ...registeredClaims,
        type: TokenType.REFRESH_TOKEN,
        roles: ['user'],
      }).success,
    ).toBe(false);
  });
});
