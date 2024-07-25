import { ConflictException } from '@nestjs/common';

export class DuplicateResourceCreated extends ConflictException {
  constructor(error?: string) {
    super('error.duplicateResourceCreated', error);
  }
}
