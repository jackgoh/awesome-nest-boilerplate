import { createRequire } from 'node:module';

import { Injectable } from '@nestjs/common';

const { v7: uuid } = createRequire(__filename)('uuid') as { v7: () => string };

@Injectable()
export class GeneratorService {
  public uuid(): string {
    return uuid();
  }

  public fileName(ext: string): string {
    return this.uuid() + '.' + ext;
  }
}
