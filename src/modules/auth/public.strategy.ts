import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport';

@Injectable()
export class PublicStrategy extends PassportStrategy(Strategy, 'public') {
  constructor() {
    super();
  }

  validate(): Record<symbol, boolean> {
    return { [Symbol.for('isPublic')]: true };
  }

  authenticate(): void {
    return this.success({ [Symbol.for('isPublic')]: true });
  }
}
