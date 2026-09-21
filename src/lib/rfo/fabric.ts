/**
 * Fabric object store — in-memory primary; optional Postgres when DATABASE_URL + table exist.
 * Soft-fails to memory so Spike 1 works without migrations. Org-scoped when org context set.
 */

import { getDb } from "@/db/client";
import type { FabricKind, FabricObject, FabricObjectStatus } from "./types";
import { getOrgIdOrNull } from "@/lib/auth/org-context";

const memory = new Map<string, FabricObject & { organizationId?: string }>();

let dbTableChecked = false;
let dbTableOk = false;

function newId(kind: FabricKind): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${kind}_${Date.now()}_${rand}`;
}

async function ensureDbTable(): Promise<boolean> {
  if (dbTableChecked) return dbTableOk;
  dbTableChecked = true;
  const db = getDb();
  if (!db) {
    dbTableOk = false;
    return false;
  }
  try {
    const { sql: dsql } = await import("drizzle-orm");
    await db.execute(dsql`
      CREATE TABLE IF NOT EXISTS fabric_objects (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL DEFAULT 'legacy',
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'trusted',
        source_adapter_id TEXT,
        play_id TEXT,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(dsql`
      ALTER TABLE fabric_objects ADD COLUMN IF NOT EXISTS organization_id TEXT
    `);
    await db.execute(dsql`
      UPDATE fabric_objects SET organization_id = 'legacy' WHERE organization_id IS NULL
    `);
    await db.execute(dsql`
      CREATE INDEX IF NOT EXISTS fabric_objects_org_kind_idx ON fabric_objects (organization_id, kind)
    `);
    dbTableOk = true;
    return true;
  } catch {
    dbTableOk = false;
    return false;
  }
}

export type CreateFabricInput = {
  kind: FabricKind;
  title: string;
  payload: Record<string, unknown>;
  status?: FabricObjectStatus;
  sourceAdapterId?: string;
  playId?: string;
  id?: string;
  organizationId?: string;
};

export async function createFabricObject(
  input: CreateFabricInput
): Promise<FabricObject> {
  const organizationId =
    input.organizationId ?? getOrgIdOrNull() ?? "legacy";
  const obj: FabricObject & { organizationId?: string } = {
    id: input.id ?? newId(input.kind),
    kind: input.kind,
    title: input.title,
    status: input.status ?? "trusted",
    createdAt: new Date().toISOString(),
    sourceAdapterId: input.sourceAdapterId,
    playId: input.playId,
    payload: input.payload,
    organizationId,
  };

  memory.set(obj.id, obj);

  if (await ensureDbTable()) {
    try {
      const db = getDb();
      if (db) {
        const { sql: dsql } = await import("drizzle-orm");
        await db.execute(dsql`
          INSERT INTO fabric_objects (id, organization_id, kind, title, status, source_adapter_id, play_id, payload, created_at)
          VALUES (
            ${obj.id},
            ${organizationId},
            ${obj.kind},
            ${obj.title},
            ${obj.status},
            ${obj.sourceAdapterId ?? null},
            ${obj.playId ?? null},
            ${JSON.stringify(obj.payload)}::jsonb,
            ${obj.createdAt}::timestamptz
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            status = EXCLUDED.status,
            payload = EXCLUDED.payload,
            organization_id = EXCLUDED.organization_id
        `);
      }
    } catch {
      // memory remains source of truth
    }
  }

  return obj;
}

export async function getFabricObject(
  id: string
): Promise<FabricObject | null> {
  const mem = memory.get(id);
  if (mem) return mem;

  if (await ensureDbTable()) {
    try {
      const db = getDb();
      if (!db) return null;
      const { sql: dsql } = await import("drizzle-orm");
      const orgId = getOrgIdOrNull();
      const rows = orgId
        ? await db.execute(dsql`
            SELECT id, organization_id, kind, title, status, source_adapter_id, play_id, payload, created_at
            FROM fabric_objects WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1
          `)
        : await db.execute(dsql`
            SELECT id, organization_id, kind, title, status, source_adapter_id, play_id, payload, created_at
            FROM fabric_objects WHERE id = ${id} LIMIT 1
          `);
      const row = (rows as unknown as Array<Record<string, unknown>>)[0];
      if (!row) return null;
      const obj = rowToFabric(row);
      memory.set(obj.id, obj);
      return obj;
    } catch {
      return null;
    }
  }
  return null;
}

export async function listFabricObjects(opts?: {
  kind?: FabricKind;
  limit?: number;
  organizationId?: string;
}): Promise<FabricObject[]> {
  const limit = opts?.limit ?? 50;
  const orgId = opts?.organizationId ?? getOrgIdOrNull();

  let fromMem = [...memory.values()];
  if (orgId) {
    fromMem = fromMem.filter(
      (o) => !o.organizationId || o.organizationId === orgId
    );
  }
  if (opts?.kind) {
    fromMem = fromMem.filter((o) => o.kind === opts.kind);
  }
  fromMem.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  if (await ensureDbTable()) {
    try {
      const db = getDb();
      if (db) {
        const { sql: dsql } = await import("drizzle-orm");
        const rows =
          orgId && opts?.kind
            ? await db.execute(dsql`
                SELECT id, organization_id, kind, title, status, source_adapter_id, play_id, payload, created_at
                FROM fabric_objects
                WHERE organization_id = ${orgId} AND kind = ${opts.kind}
                ORDER BY created_at DESC
                LIMIT ${limit}
              `)
            : orgId
              ? await db.execute(dsql`
                  SELECT id, organization_id, kind, title, status, source_adapter_id, play_id, payload, created_at
                  FROM fabric_objects
                  WHERE organization_id = ${orgId}
                  ORDER BY created_at DESC
                  LIMIT ${limit}
                `)
              : opts?.kind
                ? await db.execute(dsql`
                    SELECT id, organization_id, kind, title, status, source_adapter_id, play_id, payload, created_at
                    FROM fabric_objects
                    WHERE kind = ${opts.kind}
                    ORDER BY created_at DESC
                    LIMIT ${limit}
                  `)
                : await db.execute(dsql`
                    SELECT id, organization_id, kind, title, status, source_adapter_id, play_id, payload, created_at
                    FROM fabric_objects
                    ORDER BY created_at DESC
                    LIMIT ${limit}
                  `);
        const fromDb = (rows as unknown as Array<Record<string, unknown>>).map(
          rowToFabric
        );
        const byId = new Map<string, FabricObject>();
        for (const o of fromDb) byId.set(o.id, o);
        for (const o of fromMem) byId.set(o.id, o);
        return [...byId.values()]
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          .slice(0, limit);
      }
    } catch {
      // fall through to memory
    }
  }

  return fromMem.slice(0, limit);
}

function rowToFabric(row: Record<string, unknown>): FabricObject & {
  organizationId?: string;
} {
  const payload =
    typeof row.payload === "string"
      ? (JSON.parse(row.payload) as Record<string, unknown>)
      : ((row.payload as Record<string, unknown>) ?? {});
  const createdAt =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : String(row.created_at ?? new Date().toISOString());
  return {
    id: String(row.id),
    kind: row.kind as FabricKind,
    title: String(row.title),
    status: (row.status as FabricObjectStatus) ?? "trusted",
    createdAt,
    sourceAdapterId: row.source_adapter_id
      ? String(row.source_adapter_id)
      : undefined,
    playId: row.play_id ? String(row.play_id) : undefined,
    payload,
    organizationId: row.organization_id
      ? String(row.organization_id)
      : undefined,
  };
}

/** Test helper — clear in-memory store. */
export function clearFabricMemory(): void {
  memory.clear();
}
