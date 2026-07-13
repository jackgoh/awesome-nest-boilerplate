import { Injectable } from '@nestjs/common';

import { generateUuid } from '../../common/uuid';

@Injectable()
export class GeneratorService {
  public uuid(): string {
    return generateUuid();
  }

  public fileName(ext: string): string {
    return this.uuid() + '.' + ext;
  }
}
