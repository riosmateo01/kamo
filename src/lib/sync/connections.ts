import { eq, desc, and } from "drizzle-orm";
import { getDb, isDatabaseConfigured, markDbUnavailable } from "@/db/client";
import {
  connectionTokens,
  syncRuns,
  harvestRawClients,
} from "@/db/schema";
import { getOrgIdOrNull } from "@/lib/auth/org-context";

export type ConnectionStatus = {
  provider: "harvest" | "qbo";
  connected: boolean;
  accountLabel: string | null;
  realmId: string | null;
  updatedAt: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
};

export async function listConnectionStatuses(
  organizationId?: string
): Promise<{
  dbAvailable: boolean;
  harvest: ConnectionStatus;
  qbo: ConnectionStatus;
}> {
  const empty = (provider: "harvest" | "qbo"): ConnectionStatus => ({
    provider,
    connected: false,
    accountLabel: null,
    realmId: null,
    updatedAt: null,
    lastSyncAt: null,
    lastSyncStatus: null,
  });

  if (!isDatabaseConfigured()) {
    return {
      dbAvailable: false,
      harvest: empty("harvest"),
      qbo: empty("qbo"),
    };
  }

  const db = getDb();
  if (!db) {
    return {
      dbAvailable: false,
      harvest: empty("harvest"),
      qbo: empty("qbo"),
    };
  }

  const orgId = organizationId ?? getOrgIdOrNull();
  if (!orgId) {
    return {
      dbAvailable: true,
      harvest: empty("harvest"),
      qbo: empty("qbo"),
    };
  }

  try {
    const tokens = await db
      .select()
      .from(connectionTokens)
      .where(eq(connectionTokens.organizationId, orgId));
    const harvestTok = tokens.find((t) => t.provider === "harvest");
    const qboTok = tokens.find((t) => t.provider === "qbo");

    const harvestRuns = await db
      .select()
      .from(syncRuns)
      .where(
        and(
          eq(syncRuns.organizationId, orgId),
          eq(syncRuns.provider, "harvest")
        )
      )
      .orderBy(desc(syncRuns.startedAt))
      .limit(1);
    const qboRuns = await db
      .select()
      .from(syncRuns)
      .where(
        and(eq(syncRuns.organizationId, orgId), eq(syncRuns.provider, "qbo"))
      )
      .orderBy(desc(syncRuns.startedAt))
      .limit(1);
    const seedRuns = await db
      .select()
      .from(syncRuns)
      .where(
        and(eq(syncRuns.organizationId, orgId), eq(syncRuns.provider, "seed"))
      )
      .orderBy(desc(syncRuns.startedAt))
      .limit(1);
    const bothRuns = await db
      .select()
      .from(syncRuns)
      .where(
        and(eq(syncRuns.organizationId, orgId), eq(syncRuns.provider, "both"))
      )
      .orderBy(desc(syncRuns.startedAt))
      .limit(1);

    const fallbackSync = seedRuns[0] ?? bothRuns[0] ?? null;

    const pickSync = (specific: (typeof harvestRuns)[0] | undefined) => {
      const run = specific ?? fallbackSync;
      return {
        lastSyncAt:
          run?.finishedAt?.toISOString() ??
          run?.startedAt?.toISOString() ??
          null,
        lastSyncStatus: run?.status ?? null,
      };
    };

    return {
      dbAvailable: true,
      harvest: {
        provider: "harvest",
        connected: Boolean(harvestTok),
        accountLabel: harvestTok?.accountLabel ?? null,
        realmId: harvestTok?.realmId ?? null,
        updatedAt: harvestTok?.updatedAt?.toISOString() ?? null,
        ...pickSync(harvestRuns[0]),
      },
      qbo: {
        provider: "qbo",
        connected: Boolean(qboTok),
        accountLabel: qboTok?.accountLabel ?? null,
        realmId: qboTok?.realmId ?? null,
        updatedAt: qboTok?.updatedAt?.toISOString() ?? null,
        ...pickSync(qboRuns[0]),
      },
    };
  } catch {
    markDbUnavailable();
    return {
      dbAvailable: false,
      harvest: empty("harvest"),
      qbo: empty("qbo"),
    };
  }
}

export async function hasRecentLiveSync(
  organizationId?: string
): Promise<{
  ok: boolean;
  reason: string;
  lastSyncedAt: string | null;
}> {
  if (!isDatabaseConfigured()) {
    return { ok: false, reason: "DATABASE_URL not set", lastSyncedAt: null };
  }
  const db = getDb();
  if (!db) {
    return { ok: false, reason: "database unavailable", lastSyncedAt: null };
  }

  const orgId = organizationId ?? getOrgIdOrNull();
  if (!orgId) {
    return { ok: false, reason: "no organization", lastSyncedAt: null };
  }

  const hours = Number(process.env.SYNC_FRESHNESS_HOURS || "168");
  const maxAgeMs = (Number.isFinite(hours) ? hours : 168) * 3600_000;

  try {
    const clients = await db
      .select()
      .from(harvestRawClients)
      .where(eq(harvestRawClients.organizationId, orgId))
      .limit(1);
    if (clients.length === 0) {
      return { ok: false, reason: "no synced harvest data", lastSyncedAt: null };
    }
    const syncedAt = clients[0].syncedAt;
    const age = Date.now() - syncedAt.getTime();
    if (age > maxAgeMs) {
      return {
        ok: false,
        reason: `sync older than ${hours}h`,
        lastSyncedAt: syncedAt.toISOString(),
      };
    }
    return {
      ok: true,
      reason: "recent sync present",
      lastSyncedAt: syncedAt.toISOString(),
    };
  } catch {
    markDbUnavailable();
    return { ok: false, reason: "database error", lastSyncedAt: null };
  }
}
