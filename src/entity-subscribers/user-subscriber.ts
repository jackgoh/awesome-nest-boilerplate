import { type EntitySubscriberInterface, EventSubscriber } from 'typeorm';

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

  afterLoad(entity: UserEntity): void {
    const roles = (entity as Partial<UserEntity>).roles ?? [];
    const rolePermissions = roles.flatMap((role) =>
      role.permissions.map((permission) => permission.name),
    );

    const directPermissions =
      entity.directPermissions?.map((p) => p.name) ?? [];

    entity.computedPermissions = [
      ...new Set([...rolePermissions, ...directPermissions]),
    ];
  }
}
