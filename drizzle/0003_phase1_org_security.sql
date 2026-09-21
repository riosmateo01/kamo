-- Phase 1: organization_id multi-tenancy + audit_events + jobs
-- Legacy rows get organization_id = 'legacy'. Prod should wipe or re-connect.
-- Safe-ish re-run: uses IF NOT EXISTS / guarded drops where practical.

-- —— connection_tokens ——
ALTER TABLE "connection_tokens" ADD COLUMN IF NOT EXISTS "organization_id" text;
UPDATE "connection_tokens" SET "organization_id" = 'legacy' WHERE "organization_id" IS NULL;
ALTER TABLE "connection_tokens" ALTER COLUMN "organization_id" SET NOT NULL;
DROP INDEX IF EXISTS "connection_tokens_provider_uidx";
CREATE UNIQUE INDEX IF NOT EXISTS "connection_tokens_org_provider_uidx"
  ON "connection_tokens" ("organization_id", "provider");

-- —— harvest raw (composite PK) ——
ALTER TABLE "harvest_raw_clients" ADD COLUMN IF NOT EXISTS "organization_id" text;
UPDATE "harvest_raw_clients" SET "organization_id" = 'legacy' WHERE "organization_id" IS NULL;
ALTER TABLE "harvest_raw_clients" ALTER COLUMN "organization_id" SET NOT NULL;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'harvest_raw_clients' AND constraint_type = 'PRIMARY KEY'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage
    WHERE table_name = 'harvest_raw_clients' AND column_name = 'organization_id'
      AND constraint_name IN (
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'harvest_raw_clients' AND constraint_type = 'PRIMARY KEY'
      )
  ) THEN
    ALTER TABLE "harvest_raw_clients" DROP CONSTRAINT "harvest_raw_clients_pkey";
    ALTER TABLE "harvest_raw_clients" ADD PRIMARY KEY ("organization_id", "id");
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'harvest_raw_clients' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE "harvest_raw_clients" ADD PRIMARY KEY ("organization_id", "id");
  END IF;
END $$;

ALTER TABLE "harvest_raw_projects" ADD COLUMN IF NOT EXISTS "organization_id" text;
UPDATE "harvest_raw_projects" SET "organization_id" = 'legacy' WHERE "organization_id" IS NULL;
ALTER TABLE "harvest_raw_projects" ALTER COLUMN "organization_id" SET NOT NULL;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'harvest_raw_projects' AND constraint_type = 'PRIMARY KEY'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage
    WHERE table_name = 'harvest_raw_projects' AND column_name = 'organization_id'
      AND constraint_name IN (
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'harvest_raw_projects' AND constraint_type = 'PRIMARY KEY'
      )
  ) THEN
    ALTER TABLE "harvest_raw_projects" DROP CONSTRAINT "harvest_raw_projects_pkey";
    ALTER TABLE "harvest_raw_projects" ADD PRIMARY KEY ("organization_id", "id");
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'harvest_raw_projects' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE "harvest_raw_projects" ADD PRIMARY KEY ("organization_id", "id");
  END IF;
END $$;

ALTER TABLE "harvest_raw_time_entries" ADD COLUMN IF NOT EXISTS "organization_id" text;
UPDATE "harvest_raw_time_entries" SET "organization_id" = 'legacy' WHERE "organization_id" IS NULL;
ALTER TABLE "harvest_raw_time_entries" ALTER COLUMN "organization_id" SET NOT NULL;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'harvest_raw_time_entries' AND constraint_type = 'PRIMARY KEY'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage
    WHERE table_name = 'harvest_raw_time_entries' AND column_name = 'organization_id'
      AND constraint_name IN (
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'harvest_raw_time_entries' AND constraint_type = 'PRIMARY KEY'
      )
  ) THEN
    ALTER TABLE "harvest_raw_time_entries" DROP CONSTRAINT "harvest_raw_time_entries_pkey";
    ALTER TABLE "harvest_raw_time_entries" ADD PRIMARY KEY ("organization_id", "id");
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'harvest_raw_time_entries' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE "harvest_raw_time_entries" ADD PRIMARY KEY ("organization_id", "id");
  END IF;
END $$;
DROP INDEX IF EXISTS "harvest_raw_time_entries_date_idx";
CREATE INDEX IF NOT EXISTS "harvest_raw_time_entries_org_date_idx"
  ON "harvest_raw_time_entries" ("organization_id", "date");

-- —— qbo raw ——
ALTER TABLE "qbo_raw_customers" ADD COLUMN IF NOT EXISTS "organization_id" text;
UPDATE "qbo_raw_customers" SET "organization_id" = 'legacy' WHERE "organization_id" IS NULL;
ALTER TABLE "qbo_raw_customers" ALTER COLUMN "organization_id" SET NOT NULL;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'qbo_raw_customers' AND constraint_type = 'PRIMARY KEY'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage
    WHERE table_name = 'qbo_raw_customers' AND column_name = 'organization_id'
      AND constraint_name IN (
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'qbo_raw_customers' AND constraint_type = 'PRIMARY KEY'
      )
  ) THEN
    ALTER TABLE "qbo_raw_customers" DROP CONSTRAINT "qbo_raw_customers_pkey";
    ALTER TABLE "qbo_raw_customers" ADD PRIMARY KEY ("organization_id", "id");
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'qbo_raw_customers' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE "qbo_raw_customers" ADD PRIMARY KEY ("organization_id", "id");
  END IF;
END $$;

ALTER TABLE "qbo_raw_jobs" ADD COLUMN IF NOT EXISTS "organization_id" text;
UPDATE "qbo_raw_jobs" SET "organization_id" = 'legacy' WHERE "organization_id" IS NULL;
ALTER TABLE "qbo_raw_jobs" ALTER COLUMN "organization_id" SET NOT NULL;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'qbo_raw_jobs' AND constraint_type = 'PRIMARY KEY'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage
    WHERE table_name = 'qbo_raw_jobs' AND column_name = 'organization_id'
      AND constraint_name IN (
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'qbo_raw_jobs' AND constraint_type = 'PRIMARY KEY'
      )
  ) THEN
    ALTER TABLE "qbo_raw_jobs" DROP CONSTRAINT "qbo_raw_jobs_pkey";
    ALTER TABLE "qbo_raw_jobs" ADD PRIMARY KEY ("organization_id", "id");
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'qbo_raw_jobs' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE "qbo_raw_jobs" ADD PRIMARY KEY ("organization_id", "id");
  END IF;
END $$;

ALTER TABLE "qbo_raw_revenue_lines" ADD COLUMN IF NOT EXISTS "organization_id" text;
UPDATE "qbo_raw_revenue_lines" SET "organization_id" = 'legacy' WHERE "organization_id" IS NULL;
ALTER TABLE "qbo_raw_revenue_lines" ALTER COLUMN "organization_id" SET NOT NULL;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'qbo_raw_revenue_lines' AND constraint_type = 'PRIMARY KEY'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage
    WHERE table_name = 'qbo_raw_revenue_lines' AND column_name = 'organization_id'
      AND constraint_name IN (
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'qbo_raw_revenue_lines' AND constraint_type = 'PRIMARY KEY'
      )
  ) THEN
    ALTER TABLE "qbo_raw_revenue_lines" DROP CONSTRAINT "qbo_raw_revenue_lines_pkey";
    ALTER TABLE "qbo_raw_revenue_lines" ADD PRIMARY KEY ("organization_id", "id");
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'qbo_raw_revenue_lines' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE "qbo_raw_revenue_lines" ADD PRIMARY KEY ("organization_id", "id");
  END IF;
END $$;
DROP INDEX IF EXISTS "qbo_raw_revenue_lines_date_idx";
CREATE INDEX IF NOT EXISTS "qbo_raw_revenue_lines_org_date_idx"
  ON "qbo_raw_revenue_lines" ("organization_id", "date");

-- —— identity maps ——
ALTER TABLE "client_identity_maps" ADD COLUMN IF NOT EXISTS "organization_id" text;
UPDATE "client_identity_maps" SET "organization_id" = 'legacy' WHERE "organization_id" IS NULL;
ALTER TABLE "client_identity_maps" ALTER COLUMN "organization_id" SET NOT NULL;
DROP INDEX IF EXISTS "client_identity_maps_harvest_uidx";
CREATE UNIQUE INDEX IF NOT EXISTS "client_identity_maps_org_harvest_uidx"
  ON "client_identity_maps" ("organization_id", "harvest_client_id");

ALTER TABLE "project_identity_maps" ADD COLUMN IF NOT EXISTS "organization_id" text;
UPDATE "project_identity_maps" SET "organization_id" = 'legacy' WHERE "organization_id" IS NULL;
ALTER TABLE "project_identity_maps" ALTER COLUMN "organization_id" SET NOT NULL;
DROP INDEX IF EXISTS "project_identity_maps_harvest_uidx";
CREATE UNIQUE INDEX IF NOT EXISTS "project_identity_maps_org_harvest_uidx"
  ON "project_identity_maps" ("organization_id", "harvest_project_id");

-- —— weekly_snapshots ——
ALTER TABLE "weekly_snapshots" ADD COLUMN IF NOT EXISTS "organization_id" text;
UPDATE "weekly_snapshots" SET "organization_id" = 'legacy' WHERE "organization_id" IS NULL;
ALTER TABLE "weekly_snapshots" ALTER COLUMN "organization_id" SET NOT NULL;
DROP INDEX IF EXISTS "weekly_snapshots_week_uidx";
CREATE UNIQUE INDEX IF NOT EXISTS "weekly_snapshots_org_week_uidx"
  ON "weekly_snapshots" ("organization_id", "week_start", "week_end");

-- —— sync_runs ——
ALTER TABLE "sync_runs" ADD COLUMN IF NOT EXISTS "organization_id" text;
UPDATE "sync_runs" SET "organization_id" = 'legacy' WHERE "organization_id" IS NULL;
ALTER TABLE "sync_runs" ALTER COLUMN "organization_id" SET NOT NULL;

-- —— subscriptions ——
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "organization_id" text;
UPDATE "subscriptions" SET "organization_id" = 'legacy' WHERE "organization_id" IS NULL;
ALTER TABLE "subscriptions" ALTER COLUMN "organization_id" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_org_uidx"
  ON "subscriptions" ("organization_id");

-- —— fabric_objects ——
ALTER TABLE "fabric_objects" ADD COLUMN IF NOT EXISTS "organization_id" text;
UPDATE "fabric_objects" SET "organization_id" = 'legacy' WHERE "organization_id" IS NULL;
ALTER TABLE "fabric_objects" ALTER COLUMN "organization_id" SET NOT NULL;
DROP INDEX IF EXISTS "fabric_objects_kind_idx";
CREATE INDEX IF NOT EXISTS "fabric_objects_org_kind_idx"
  ON "fabric_objects" ("organization_id", "kind");

-- —— audit_events (append-only) ——
CREATE TABLE IF NOT EXISTS "audit_events" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "actor_user_id" text,
  "action" text NOT NULL,
  "resource" text NOT NULL,
  "meta" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "audit_events_org_created_idx"
  ON "audit_events" ("organization_id", "created_at");

-- —— jobs ——
CREATE TABLE IF NOT EXISTS "jobs" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "type" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "payload" jsonb,
  "attempts" integer DEFAULT 0 NOT NULL,
  "run_after" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "finished_at" timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_idempotency_uidx" ON "jobs" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "jobs_org_status_idx" ON "jobs" ("organization_id", "status");
