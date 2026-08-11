/* eslint-disable sonarjs/no-hardcoded-passwords -- deterministic password fixtures */
import { type InsertEvent, type UpdateEvent } from 'typeorm';

import { generateHash, validateHash } from '../common/utils';
import { type UserEntity } from '../modules/user/user.entity';
import { UserSubscriber } from './user-subscriber';

jest.mock('../modules/user/user.entity', () => ({
  UserEntity: class UserEntity {},
}));

describe('UserSubscriber', () => {
  const subscriber = new UserSubscriber();

  it('awaits and replaces a password before insert', async () => {
    const entity = { password: 'new-password' } as UserEntity;

    await subscriber.beforeInsert({ entity } as InsertEvent<UserEntity>);

    expect(entity.password).toMatch(/^\$argon2id\$/);
    await expect(validateHash('new-password', entity.password)).resolves.toBe(
      true,
    );
  });

  it('awaits and replaces a changed password before update', async () => {
    const entity = { password: 'changed-password' } as UserEntity;
    const databaseEntity = { password: 'previous-hash' } as UserEntity;

    await subscriber.beforeUpdate({
      entity,
      databaseEntity,
    } as unknown as UpdateEvent<UserEntity>);

    expect(entity.password).toMatch(/^\$argon2id\$/);
    await expect(
      validateHash('changed-password', entity.password),
    ).resolves.toBe(true);
  });

  it('does not replace an unchanged password during update', async () => {
    const existingHash = await generateHash('unchanged-password');
    const entity = { password: existingHash } as UserEntity;
    const databaseEntity = { password: existingHash } as UserEntity;

    await subscriber.beforeUpdate({
      entity,
      databaseEntity,
    } as unknown as UpdateEvent<UserEntity>);

    expect(entity.password).toBe(existingHash);
  });
});
