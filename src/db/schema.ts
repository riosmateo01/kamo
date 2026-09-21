/**
 * Phase 1 multi-tenant schema (Drizzle).
 * Every tenant-owned row carries organization_id (Clerk org id).
 * Legacy single-tenant rows migrate to organization_id = 'legacy'.
 *
 * Tokens: access_token_cipher / refresh_token_cipher are AES-256-GCM
 * (v1:iv:tag:ciphertext). See src/lib/auth/crypto.ts.
 */

import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

export const connectionTokens = pgTable(
  "connection_tokens",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    /** "harvest" | "qbo" */
    provider: text("provider").notNull(),
    accountLabel: text("account_label"),
    /** AES-256-GCM ciphertext */
    accessTokenCipher: text("access_token_cipher").notNull(),
    refreshTokenCipher: text("refresh_token_cipher"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    /** QBO realm id, or Harvest account id (shared column per provider) */
    realmId: text("realm_id"),
    scopes: text("scopes"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("connection_tokens_org_provider_uidx").on(
      t.organizationId,
      t.provider
    ),
  ]
);

/** Raw Harvest clients — composite PK (org, source id) */
export const harvestRawClients = pgTable(
  "harvest_raw_clients",
  {
    organizationId: text("organization_id").notNull(),
    id: text("id").notNull(), // Harvest source id
    payload: jsonb("payload").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.id] })]
);

export const harvestRawProjects = pgTable(
  "harvest_raw_projects",
  {
    organizationId: text("organization_id").notNull(),
    id: text("id").notNull(),
    payload: jsonb("payload").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.id] })]
);

export const harvestRawTimeEntries = pgTable(
  "harvest_raw_time_entries",
  {
    organizationId: text("organization_id").notNull(),
    id: text("id").notNull(),
    payload: jsonb("payload").notNull(),
    /** YYYY-MM-DD for range filters without parsing JSON */
    date: text("date"),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.id] }),
    index("harvest_raw_time_entries_org_date_idx").on(
      t.organizationId,
      t.date
    ),
  ]
);

export const qboRawCustomers = pgTable(
  "qbo_raw_customers",
  {
    organizationId: text("organization_id").notNull(),
    id: text("id").notNull(),
    payload: jsonb("payload").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.id] })]
);

export const qboRawJobs = pgTable(
  "qbo_raw_jobs",
  {
    organizationId: text("organization_id").notNull(),
    id: text("id").notNull(),
    payload: jsonb("payload").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.id] })]
);

export const qboRawRevenueLines = pgTable(
  "qbo_raw_revenue_lines",
  {
    organizationId: text("organization_id").notNull(),
    id: text("id").notNull(),
    payload: jsonb("payload").notNull(),
    date: text("date"),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.id] }),
    index("qbo_raw_revenue_lines_org_date_idx").on(t.organizationId, t.date),
  ]
);

export const clientIdentityMaps = pgTable(
  "client_identity_maps",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    harvestClientId: text("harvest_client_id").notNull(),
    qboCustomerId: text("qbo_customer_id").notNull(),
    status: text("status").notNull().default("mapped"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("client_identity_maps_org_harvest_uidx").on(
      t.organizationId,
      t.harvestClientId
    ),
  ]
);

export const projectIdentityMaps = pgTable(
  "project_identity_maps",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    harvestProjectId: text("harvest_project_id").notNull(),
    qboJobId: text("qbo_job_id").notNull(),
    status: text("status").notNull().default("mapped"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("project_identity_maps_org_harvest_uidx").on(
      t.organizationId,
      t.harvestProjectId
    ),
  ]
);

/** Optional weekly reconciled snapshots for history / demos */
export const weeklySnapshots = pgTable(
  "weekly_snapshots",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    weekStart: text("week_start").notNull(),
    weekEnd: text("week_end").notNull(),
    payload: jsonb("payload").notNull(),
    source: text("source").notNull().default("fixtures"), // fixtures | live
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("weekly_snapshots_org_week_uidx").on(
      t.organizationId,
      t.weekStart,
      t.weekEnd
    ),
  ]
);

export const syncRuns = pgTable("sync_runs", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  /** harvest | qbo | both | seed */
  provider: text("provider").notNull(),
  status: text("status").notNull(), // ok | error | noop
  message: text("message"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

/** Stripe subscription status — keyed by organization */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    /** active | trialing | past_due | canceled | unpaid | incomplete | … */
    status: text("status").notNull(),
    priceId: text("price_id"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("subscriptions_stripe_sub_uidx").on(t.stripeSubscriptionId),
    uniqueIndex("subscriptions_org_uidx").on(t.organizationId),
    index("subscriptions_customer_idx").on(t.stripeCustomerId),
  ]
);

/** RFO trusted working objects */
export const fabricObjects = pgTable(
  "fabric_objects",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("trusted"),
    sourceAdapterId: text("source_adapter_id"),
    playId: text("play_id"),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("fabric_objects_org_kind_idx").on(t.organizationId, t.kind),
  ]
);

/** Append-only audit log — no update/delete API */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    actorUserId: text("actor_user_id"),
    action: text("action").notNull(),
    resource: text("resource").notNull(),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_events_org_created_idx").on(
      t.organizationId,
      t.createdAt
    ),
  ]
);

/** Idempotent background jobs */
export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    type: text("type").notNull(), // sync | notify
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull().default("pending"), // pending | running | done | error
    payload: jsonb("payload"),
    attempts: integer("attempts").notNull().default(0),
    runAfter: timestamp("run_after", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("jobs_idempotency_uidx").on(t.idempotencyKey),
    index("jobs_org_status_idx").on(t.organizationId, t.status),
  ]
);
