-- Spike 1 initial schema (Drizzle). Apply with: npm run db:migrate
-- Or: psql "$DATABASE_URL" -f drizzle/0000_spike1_init.sql

CREATE TABLE IF NOT EXISTS "connection_tokens" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" text NOT NULL,
  "account_label" text,
  "access_token_cipher" text NOT NULL,
  "refresh_token_cipher" text,
  "expires_at" timestamp with time zone,
  "realm_id" text,
  "scopes" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "connection_tokens_provider_uidx" ON "connection_tokens" ("provider");

CREATE TABLE IF NOT EXISTS "harvest_raw_clients" (
  "id" text PRIMARY KEY NOT NULL,
  "payload" jsonb NOT NULL,
  "synced_at" timestamp with time zone NOT NULL
);
CREATE TABLE IF NOT EXISTS "harvest_raw_projects" (
  "id" text PRIMARY KEY NOT NULL,
  "payload" jsonb NOT NULL,
  "synced_at" timestamp with time zone NOT NULL
);
CREATE TABLE IF NOT EXISTS "harvest_raw_time_entries" (
  "id" text PRIMARY KEY NOT NULL,
  "payload" jsonb NOT NULL,
  "date" text,
  "synced_at" timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS "harvest_raw_time_entries_date_idx" ON "harvest_raw_time_entries" ("date");

CREATE TABLE IF NOT EXISTS "qbo_raw_customers" (
  "id" text PRIMARY KEY NOT NULL,
  "payload" jsonb NOT NULL,
  "synced_at" timestamp with time zone NOT NULL
);
CREATE TABLE IF NOT EXISTS "qbo_raw_jobs" (
  "id" text PRIMARY KEY NOT NULL,
  "payload" jsonb NOT NULL,
  "synced_at" timestamp with time zone NOT NULL
);
CREATE TABLE IF NOT EXISTS "qbo_raw_revenue_lines" (
  "id" text PRIMARY KEY NOT NULL,
  "payload" jsonb NOT NULL,
  "date" text,
  "synced_at" timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS "qbo_raw_revenue_lines_date_idx" ON "qbo_raw_revenue_lines" ("date");

CREATE TABLE IF NOT EXISTS "client_identity_maps" (
  "id" text PRIMARY KEY NOT NULL,
  "harvest_client_id" text NOT NULL,
  "qbo_customer_id" text NOT NULL,
  "status" text DEFAULT 'mapped' NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "client_identity_maps_harvest_uidx" ON "client_identity_maps" ("harvest_client_id");

CREATE TABLE IF NOT EXISTS "project_identity_maps" (
  "id" text PRIMARY KEY NOT NULL,
  "harvest_project_id" text NOT NULL,
  "qbo_job_id" text NOT NULL,
  "status" text DEFAULT 'mapped' NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "project_identity_maps_harvest_uidx" ON "project_identity_maps" ("harvest_project_id");

CREATE TABLE IF NOT EXISTS "weekly_snapshots" (
  "id" text PRIMARY KEY NOT NULL,
  "week_start" text NOT NULL,
  "week_end" text NOT NULL,
  "payload" jsonb NOT NULL,
  "source" text DEFAULT 'fixtures' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "weekly_snapshots_week_uidx" ON "weekly_snapshots" ("week_start", "week_end");

CREATE TABLE IF NOT EXISTS "sync_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" text NOT NULL,
  "status" text NOT NULL,
  "message" text,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "finished_at" timestamp with time zone
);
