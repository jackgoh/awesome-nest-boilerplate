import { appDataSource } from '../data-source';
import { runSeeds } from './seeds/run-seeds';

async function main(): Promise<void> {
  await runSeeds(appDataSource);
}

void main().catch((error: unknown) => {
  console.error('Database seeding failed', error);
  process.exitCode = 1;
});
