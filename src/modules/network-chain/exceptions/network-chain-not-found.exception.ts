import { NotFoundException } from '@nestjs/common';

export class NetworkChainNotFoundException extends NotFoundException {
  constructor(error?: string) {
    super('error.networkChainNotFound', error);
  }
}
