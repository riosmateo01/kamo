/**
 * Optional Postgres client. Returns null when DATABASE_URL is unset or
 * connection fails — UI falls back to fixtures.
 */

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type AppDb = PostgresJsDatabase<typeof schema>;

let cached: { db: AppDb; sql: ReturnType<typeof postgres> } | null = null;
let unavailable = false;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getDb(): AppDb | null {
  if (unavailable) return null;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;

  if (cached) return cached.db;

  try {
    const sql = postgres(url, {
      max: 3,
      idle_timeout: 20,
      connect_timeout: 3,
    });
    const db = drizzle(sql, { schema });
    cached = { db, sql };
    return db;
  } catch {
    unavailable = true;
    return null;
  }
}

/** Mark DB unavailable after a runtime connection error (soft fail → fixtures). */
export function markDbUnavailable(): void {
  unavailable = true;
  cached = null;
}
