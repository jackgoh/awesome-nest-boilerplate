import { randomUUIDv7 } from 'node:crypto';

import { type Uuid } from '../types';

export const ACCEPTED_UUID_VERSIONS = ['4', '7'] as const;
const ACCEPTED_UUID_PATTERN =
  /^[\da-f]{8}-[\da-f]{4}-[47][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

/** Generate a time-ordered UUIDv7 for new identifiers. */
export function generateUuid(): Uuid {
  return randomUUIDv7() as Uuid;
}

/** Accept UUIDv4 records created before the UUIDv7 migration and new UUIDv7s. */
export function isAcceptedUuid(value: unknown): value is Uuid {
  return typeof value === 'string' && ACCEPTED_UUID_PATTERN.test(value);
}
