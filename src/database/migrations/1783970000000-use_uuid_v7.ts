import { type MigrationInterface, type QueryRunner } from 'typeorm';

const ENTITY_TABLES = [
  'roles',
  'permissions',
  'user_settings',
  'users',
] as const;

export class UseUuidV71783970000000 implements MigrationInterface {
  name = 'UseUuidV71783970000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ENTITY_TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "id" DROP DEFAULT`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    for (const table of ENTITY_TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
      );
    }
  }
}
