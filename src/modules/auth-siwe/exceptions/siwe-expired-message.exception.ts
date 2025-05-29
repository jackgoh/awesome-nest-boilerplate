import { UnauthorizedException } from '@nestjs/common';

export class SiweExpiredMessageException extends UnauthorizedException {
  constructor(error?: string) {
    super('error.siweExpiredMessage', error);
  }
}
