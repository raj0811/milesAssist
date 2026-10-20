import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1792496484417 implements MigrationInterface {
    name = 'InitialSchema1792496484417'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('viewer', 'editor', 'admin')`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive', 'suspended')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'viewer', "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', "lastActiveAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users"  ("email") `);
        await queryRunner.query(`CREATE TYPE "public"."admins_role_enum" AS ENUM('super_admin', 'admin')`);
        await queryRunner.query(`CREATE TABLE "admins" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "role" "public"."admins_role_enum" NOT NULL DEFAULT 'admin', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_051db7d37d478a69a7432df1479" UNIQUE ("email"), CONSTRAINT "PK_e3b38270c97a854c48d2e80874e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."bookings_meetingtype_enum" AS ENUM('virtual', 'in_person')`);
        await queryRunner.query(`CREATE TYPE "public"."bookings_status_enum" AS ENUM('pending', 'confirmed', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bookingReference" character varying(50) NOT NULL, "userId" uuid NOT NULL, "serviceName" character varying(150) NOT NULL, "meetingType" "public"."bookings_meetingtype_enum" NOT NULL DEFAULT 'virtual', "scheduledAt" TIMESTAMP WITH TIME ZONE NOT NULL, "durationMinutes" integer NOT NULL, "meetingLocation" character varying(255), "meetingUrl" text, "specialNotes" text, "status" "public"."bookings_status_enum" NOT NULL DEFAULT 'pending', "amount" numeric(12,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'USD', "confirmedAt" TIMESTAMP WITH TIME ZONE, "completedAt" TIMESTAMP WITH TIME ZONE, "cancelledAt" TIMESTAMP WITH TIME ZONE, "cancellationReason" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_efae15c3deed139b3a0ce03f69c" UNIQUE ("bookingReference"), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_636583c0cffa8559c734fe3922" ON "bookings"  ("status", "scheduledAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_38a69a58a323647f2e75eb994d" ON "bookings"  ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_efae15c3deed139b3a0ce03f69" ON "bookings"  ("bookingReference") `);
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('payment', 'refund', 'transfer')`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_status_enum" AS ENUM('pending', 'success', 'failed', 'refunded')`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_paymentmethod_enum" AS ENUM('upi', 'credit_card', 'debit_card', 'net_banking', 'wallet', 'bank_transfer', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_settlementstatus_enum" AS ENUM('pending', 'processing', 'settled', 'failed')`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "transactionReference" character varying(50) NOT NULL, "userId" uuid NOT NULL, "type" "public"."transactions_type_enum" NOT NULL, "amount" numeric(14,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'INR', "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'pending', "initiatedAt" TIMESTAMP WITH TIME ZONE, "paidAt" TIMESTAMP WITH TIME ZONE, "failureReason" text, "gatewayName" character varying(50), "gatewayTransactionId" character varying(150), "gatewayReference" character varying(150), "paymentMethod" "public"."transactions_paymentmethod_enum", "paymentDetails" jsonb, "settlementStatus" "public"."transactions_settlementstatus_enum" NOT NULL DEFAULT 'pending', "settledAt" TIMESTAMP WITH TIME ZONE, "settlementUtr" character varying(150), "settledAmount" numeric(14,2), "notes" text, "originalTransactionId" uuid, "bookingId" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a25ab27d5ea60399014da598a0c" UNIQUE ("transactionReference"), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7467b91451a370f73b1248ceb3" ON "transactions"  ("settlementStatus", "settledAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_2874f3eb01a20703b61655327a" ON "transactions"  ("gatewayName", "gatewayTransactionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_5dc7be0581e635b1bb55caea1b" ON "transactions"  ("status", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_6bb58f2b6e30cb51a6504599f4" ON "transactions"  ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a25ab27d5ea60399014da598a0" ON "transactions"  ("transactionReference") `);
        await queryRunner.query(`CREATE TYPE "public"."system_alerts_severity_enum" AS ENUM('info', 'warning', 'critical')`);
        await queryRunner.query(`CREATE TYPE "public"."system_alerts_status_enum" AS ENUM('open', 'acknowledged', 'resolved')`);
        await queryRunner.query(`CREATE TABLE "system_alerts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(150) NOT NULL, "description" text NOT NULL, "severity" "public"."system_alerts_severity_enum" NOT NULL DEFAULT 'info', "status" "public"."system_alerts_status_enum" NOT NULL DEFAULT 'open', "resolvedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c4754bccb48e096e7da8eda23f3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1587e70eeb86f2550f2d2b623b" ON "system_alerts"  ("severity", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_d24f278ff668c990c9ca35d4f1" ON "system_alerts"  ("status", "createdAt") `);
        await queryRunner.query(`CREATE TABLE "transaction_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "transactionId" uuid NOT NULL, "eventType" character varying(100) NOT NULL, "description" text, "reference" character varying(100), "metadata" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e0b1cdc84612e5aebf6e6273ff4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ca803630eb281728f82f4050be" ON "transaction_events"  ("transactionId", "createdAt") `);
        await queryRunner.query(`CREATE TYPE "public"."refunds_status_enum" AS ENUM('pending', 'processing', 'success', 'failed')`);
        await queryRunner.query(`CREATE TABLE "refunds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "transactionId" uuid NOT NULL, "refundReference" character varying(50) NOT NULL, "gatewayRefundId" character varying(150), "arn" character varying(150), "amount" numeric(14,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'INR', "status" "public"."refunds_status_enum" NOT NULL DEFAULT 'pending', "initiatedAt" TIMESTAMP WITH TIME ZONE, "processedAt" TIMESTAMP WITH TIME ZONE, "failureReason" text, "notes" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5106efb01eeda7e49a78b869738" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_767656b1130111aaa9ca277d08" ON "refunds"  ("status", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_b2b8c0c33487a5b9a573767355" ON "refunds"  ("transactionId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ebb1308cf93c4a07c2cf6b4c96" ON "refunds"  ("refundReference") `);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_38a69a58a323647f2e75eb994de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_7cb20660f1fbb1ddb4358bedd8a" FOREIGN KEY ("originalTransactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_f9ea0e567005f90669eff3ceded" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_events" ADD CONSTRAINT "FK_9f7f6d0b1f927a1808025877da6" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refunds" ADD CONSTRAINT "FK_b2b8c0c33487a5b9a573767355f" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refunds" DROP CONSTRAINT "FK_b2b8c0c33487a5b9a573767355f"`);
        await queryRunner.query(`ALTER TABLE "transaction_events" DROP CONSTRAINT "FK_9f7f6d0b1f927a1808025877da6"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_f9ea0e567005f90669eff3ceded"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_7cb20660f1fbb1ddb4358bedd8a"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_38a69a58a323647f2e75eb994de"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ebb1308cf93c4a07c2cf6b4c96"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b2b8c0c33487a5b9a573767355"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_767656b1130111aaa9ca277d08"`);
        await queryRunner.query(`DROP TABLE "refunds"`);
        await queryRunner.query(`DROP TYPE "public"."refunds_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ca803630eb281728f82f4050be"`);
        await queryRunner.query(`DROP TABLE "transaction_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d24f278ff668c990c9ca35d4f1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1587e70eeb86f2550f2d2b623b"`);
        await queryRunner.query(`DROP TABLE "system_alerts"`);
        await queryRunner.query(`DROP TYPE "public"."system_alerts_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."system_alerts_severity_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a25ab27d5ea60399014da598a0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6bb58f2b6e30cb51a6504599f4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5dc7be0581e635b1bb55caea1b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2874f3eb01a20703b61655327a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7467b91451a370f73b1248ceb3"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_settlementstatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_paymentmethod_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_efae15c3deed139b3a0ce03f69"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_38a69a58a323647f2e75eb994d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_636583c0cffa8559c734fe3922"`);
        await queryRunner.query(`DROP TABLE "bookings"`);
        await queryRunner.query(`DROP TYPE "public"."bookings_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."bookings_meetingtype_enum"`);
        await queryRunner.query(`DROP TABLE "admins"`);
        await queryRunner.query(`DROP TYPE "public"."admins_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}
