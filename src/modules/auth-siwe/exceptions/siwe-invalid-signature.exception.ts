import { UnauthorizedException } from '@nestjs/common';

export class SiweInvalidSignatureException extends UnauthorizedException {
  constructor(error?: string) {
    super('error.siweInvalidSignature', error);
  }
}
