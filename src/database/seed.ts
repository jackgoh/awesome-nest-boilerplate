import { appDataSource } from '../data-source';
import { runSeeds } from './seeds/run-seeds';

void runSeeds(appDataSource).catch((error: unknown) => {
  console.error('Database seeding failed', error);
  process.exitCode = 1;
});
