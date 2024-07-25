import { BadRequestException } from '@nestjs/common';

export class ChainNotSupportedException extends BadRequestException {
  constructor(chainId: number) {
    super(`Chain ${chainId} is not supported in this platform.`);
  }
}
