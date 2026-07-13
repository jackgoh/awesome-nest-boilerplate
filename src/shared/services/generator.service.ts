import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

@Injectable()
export class GeneratorService {
  public uuid(): string {
    return randomUUID();
  }

  public fileName(ext: string): string {
    return this.uuid() + '.' + ext;
  }
}
