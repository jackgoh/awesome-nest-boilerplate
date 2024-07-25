import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1721924423822 implements MigrationInterface {
    name = 'Init1721924423822'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."wallet_users_role_enum" AS ENUM('USER', 'ADMIN')`);
        await queryRunner.query(`CREATE TABLE "wallet_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "wallet_address" character varying(100) NOT NULL, "wallet_key" character varying, "role" "public"."wallet_users_role_enum" NOT NULL DEFAULT 'USER', CONSTRAINT "PK_14a29216163e0c0f648d9cebdf9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "network_chains" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "chain_name" character varying(100) NOT NULL, "chain_id" integer NOT NULL, CONSTRAINT "PK_1dbe73235e180f022f92b2a4bb6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(10) NOT NULL, "symbol" character varying(10) NOT NULL, "decimals" integer NOT NULL, "contract_address" character varying(100) NOT NULL, "chain_id" uuid, CONSTRAINT "UQ_3b0541a15e8aa18e596933cbc4f" UNIQUE ("contract_address"), CONSTRAINT "PK_3001e89ada36263dabf1fb6210a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "is_email_verified" boolean NOT NULL DEFAULT false, "is_phone_verified" boolean NOT NULL DEFAULT false, "user_id" uuid NOT NULL, CONSTRAINT "REL_4ed056b9344e6f7d8d46ec4b30" UNIQUE ("user_id"), CONSTRAINT "PK_00f004f5922a0744d174530d639" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('USER', 'ADMIN')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "first_name" character varying, "last_name" character varying, "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER', "email" character varying, "password" character varying, "phone" character varying, "avatar" character varying, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "tokens" ADD CONSTRAINT "FK_146682b87089cb89412039459bc" FOREIGN KEY ("chain_id") REFERENCES "network_chains"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_settings" ADD CONSTRAINT "FK_4ed056b9344e6f7d8d46ec4b302" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_settings" DROP CONSTRAINT "FK_4ed056b9344e6f7d8d46ec4b302"`);
        await queryRunner.query(`ALTER TABLE "tokens" DROP CONSTRAINT "FK_146682b87089cb89412039459bc"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "user_settings"`);
        await queryRunner.query(`DROP TABLE "tokens"`);
        await queryRunner.query(`DROP TABLE "network_chains"`);
        await queryRunner.query(`DROP TABLE "wallet_users"`);
        await queryRunner.query(`DROP TYPE "public"."wallet_users_role_enum"`);
    }

}
