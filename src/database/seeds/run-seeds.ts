import { type DataSource } from 'typeorm';

import { OutboxEventEntity } from '../../modules/outbox/outbox-event.entity';
import { UserEntity } from '../../modules/user/user.entity';
import { seedPermissions } from './permissions.seeder';
import { seedRoles } from './roles.seeder';

/**
 * Run the complete seed set atomically. The function accepts either a fresh or
 * already-initialized DataSource and only closes connections it initialized.
 */
export async function runSeeds(dataSource: DataSource): Promise<void> {
  const isConnectionOwned = !dataSource.isInitialized;

  if (isConnectionOwned) {
    await dataSource.initialize();
  }

  try {
    await dataSource.transaction(async (manager) => {
      await seedPermissions(manager);
      const affectedUserIds = await seedRoles(manager);

      if (affectedUserIds.length === 0) {
        return;
      }

      await manager
        .createQueryBuilder()
        .update(UserEntity)
        .set({
          authorizationRevision: () => '"authorization_revision" + 1',
        })
        .whereInIds(affectedUserIds)
        .execute();
      const outboxRepository = manager.getRepository(OutboxEventEntity);

      await outboxRepository.save(
        outboxRepository.create({
          type: 'authorization.changed',
          payload: {
            userIds: affectedUserIds,
            cause: 'system-roles.seeded',
          },
        }),
      );
    });
  } finally {
    if (isConnectionOwned) {
      await dataSource.destroy();
    }
  }
}
