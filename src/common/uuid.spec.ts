import { randomUUID } from 'node:crypto';

import { isUUID } from 'class-validator';

import { AbstractEntity } from './abstract.entity';
import { generateUuid, isAcceptedUuid } from './uuid';

class TestEntity extends AbstractEntity {}

describe('UUID generation', () => {
  it('generates RFC 9562 UUIDv7 identifiers', () => {
    const id = generateUuid();

    expect(isUUID(id, '7')).toBe(true);
    expect(isAcceptedUuid(id)).toBe(true);
  });

  it('assigns UUIDv7 identifiers to new entities before persistence', () => {
    expect(isUUID(new TestEntity().id, '7')).toBe(true);
  });

  it('embeds the current Unix timestamp in the sortable prefix', () => {
    const beforeGeneration = Date.now();
    const id = generateUuid();
    const afterGeneration = Date.now();
    const embeddedTimestamp = Number.parseInt(
      id.replaceAll('-', '').slice(0, 12),
      16,
    );

    expect(embeddedTimestamp).toBeGreaterThanOrEqual(beforeGeneration);
    expect(embeddedTimestamp).toBeLessThanOrEqual(afterGeneration);
  });

  it('continues to accept UUIDv4 identifiers from existing records', () => {
    expect(isAcceptedUuid(randomUUID())).toBe(true);
    expect(isAcceptedUuid('not-a-uuid')).toBe(false);
    expect(isAcceptedUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(false);
  });
});
