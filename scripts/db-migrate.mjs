#!/usr/bin/env node
/**
 * Apply all drizzle/*.sql migrations using DATABASE_URL (sorted by name).
 * No-op with clear message if DATABASE_URL unset.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL?.trim();

if (!url) {
  console.log(
    "DATABASE_URL not set — skip migrate. UI runs on fixtures. See SPIKE-1.md / GO-LIVE.md."
  );
  process.exit(0);
}

const drizzleDir = resolve(__dirname, "../drizzle");
const files = readdirSync(drizzleDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const sql = postgres(url, { max: 1 });
try {
  for (const file of files) {
    const sqlPath = resolve(drizzleDir, file);
    const ddl = readFileSync(sqlPath, "utf8");
    await sql.unsafe(ddl);
    console.log("Migrated OK:", file);
  }
} catch (err) {
  console.error("Migrate failed:", err.message);
  process.exit(1);
} finally {
  await sql.end({ timeout: 2 });
}
