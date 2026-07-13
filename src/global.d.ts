import { type Uuid as BrandedUuid } from './types';

declare global {
  type Uuid = BrandedUuid;
}

export {};
