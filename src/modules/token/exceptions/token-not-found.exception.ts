import { NotFoundException } from '@nestjs/common';

export class TokenNotFoundException extends NotFoundException {
  constructor(error?: string) {
    super('error.tokenNotFound', error);
  }
}
