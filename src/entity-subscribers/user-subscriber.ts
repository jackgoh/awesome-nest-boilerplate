/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import {
  type EntitySubscriberInterface,
  EventSubscriber,
  type InsertEvent,
  type UpdateEvent,
} from 'typeorm';

import { generateHash } from '../common/utils';
import { UserEntity } from '../modules/user/user.entity';

/**
 * Persistence-only user hooks. Keep this subscriber constructor-free because
 * TypeORM creates configured subscriber classes outside Nest's DI container.
 * Cache invalidation belongs in the application service performing the write.
 */
@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<UserEntity> {
  listenTo(): typeof UserEntity {
    return UserEntity;
  }

  beforeInsert(event: InsertEvent<UserEntity>): void {
    if (event.entity.password) {
      event.entity.password = generateHash(event.entity.password);
    }
  }

  beforeUpdate(event: UpdateEvent<UserEntity>): void {
    if (!event.entity) {
      return;
    }

    const entity = event.entity as UserEntity;
    const databaseEntity: UserEntity | undefined = event.databaseEntity;

    if (entity.password && databaseEntity?.password) {
      if (entity.password !== databaseEntity.password) {
        entity.password = generateHash(entity.password);
      }
    } else if (entity.password) {
      entity.password = generateHash(entity.password);
    }
  }

  afterLoad(entity: UserEntity): void {
    const rolePermissions =
      entity.roles?.flatMap(
        (role) => role.permissions?.map((p) => p.name) ?? [],
      ) ?? [];

    const directPermissions =
      entity.directPermissions?.map((p) => p.name) ?? [];

    entity.computedPermissions = [
      ...new Set([...rolePermissions, ...directPermissions]),
    ];
  }
}
