import { type DataSource } from 'typeorm';

import { type Uuid } from '../../types';
import { seedPermissions } from './permissions.seeder';
import { seedRoles } from './roles.seeder';

/**
 * Run the complete seed set atomically. The function accepts either a fresh or
 * already-initialized DataSource and only closes connections it initialized.
 */
export async function runSeeds(dataSource: DataSource): Promise<Uuid[]> {
  const isConnectionOwned = !dataSource.isInitialized;

  if (isConnectionOwned) {
    await dataSource.initialize();
  }

  try {
    return await dataSource.transaction(async (manager) => {
      await seedPermissions(manager);

      return seedRoles(manager);
    });
  } finally {
    if (isConnectionOwned) {
      await dataSource.destroy();
    }
  }
}
