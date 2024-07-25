import { UnauthorizedException } from '@nestjs/common';

export class JWTExpiredException extends UnauthorizedException {
  constructor(error?: string) {
    super('error.jwtExpiredMessage', error);
  }
}
