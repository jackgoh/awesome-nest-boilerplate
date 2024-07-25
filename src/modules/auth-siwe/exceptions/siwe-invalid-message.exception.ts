import { UnauthorizedException } from '@nestjs/common';

export class SiweInvalidMessageException extends UnauthorizedException {
  constructor(error?: string) {
    super('error.siweInvalidMessage', error);
  }
}
