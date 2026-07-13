import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddIamFoundation1783974000000 implements MigrationInterface {
  name = 'AddIamFoundation1783974000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "account_status_enum" AS ENUM ('active', 'suspended', 'pending_verification', 'deleted')`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD "is_system" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "status" "account_status_enum" NOT NULL DEFAULT 'active'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "authorization_revision" bigint NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "session_version" bigint NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "suspended_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "suspended_reason" text`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `UPDATE "roles" SET "is_system" = true WHERE "name" IN ('user', 'moderator', 'admin')`,
    );
    await queryRunner.query(`UPDATE "permissions" SET "is_system" = true`);
    await queryRunner.query(
      `CREATE TABLE "audit_events" ("id" uuid NOT NULL, "actor_id" uuid, "action" character varying(100) NOT NULL, "subject_type" character varying(50) NOT NULL, "subject_id" uuid, "before" jsonb, "after" jsonb, "reason" text, "correlation_id" uuid NOT NULL, "system_admin_bypass" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_audit_events" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_events_actor" ON "audit_events" ("actor_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_events_action" ON "audit_events" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_events_subject" ON "audit_events" ("subject_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_events_correlation" ON "audit_events" ("correlation_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_events_created" ON "audit_events" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE TABLE "outbox_events" ("id" uuid NOT NULL, "type" character varying(100) NOT NULL, "payload" jsonb NOT NULL, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "processed_at" TIMESTAMP WITH TIME ZONE, "next_attempt_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "attempt_count" integer NOT NULL DEFAULT 0, "last_error" text, CONSTRAINT "PK_outbox_events" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbox_events_type" ON "outbox_events" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbox_events_occurred" ON "outbox_events" ("occurred_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbox_events_processed" ON "outbox_events" ("processed_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbox_events_next_attempt" ON "outbox_events" ("next_attempt_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "outbox_events"`);
    await queryRunner.query(`DROP TABLE "audit_events"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deleted_at"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "suspended_reason"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "suspended_at"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "session_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "authorization_revision"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status"`);
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "is_system"`);
    await queryRunner.query(`DROP TYPE "account_status_enum"`);
  }
}
