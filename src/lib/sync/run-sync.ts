import { getDb, isDatabaseConfigured } from "@/db/client";
import { connectionTokens, clientIdentityMaps, projectIdentityMaps } from "@/db/schema";
import { createHarvestMock } from "@/lib/connectors/harvest/mock";
import { createQboMock } from "@/lib/connectors/qbo/mock";
import {
  createHarvestHttp,
  fetchHarvestAccountId,
} from "@/lib/connectors/harvest/http";
import { createQboHttp } from "@/lib/connectors/qbo/http";
import { syncLookbackRange } from "@/lib/brief/period";
import { and, eq } from "drizzle-orm";
import { pullHarvest } from "./pull-harvest";
import { pullQbo } from "./pull-qbo";
import type { SyncResult } from "./types";
import { decryptToken } from "@/lib/auth/crypto";
import { ensureFreshAccessToken } from "@/lib/auth/token-refresh";
import {
  suggestClientMaps,
  suggestProjectMaps,
} from "@/lib/mapping/suggest";
import { newId } from "./id";
import { createHarvestFromDb } from "@/lib/connectors/harvest/from-db";
import { createQboFromDb } from "@/lib/connectors/qbo/from-db";
import { requireOrgId } from "@/lib/auth/org-context";

function isFixtureToken(plaintext: string): boolean {
  return plaintext === "fixture-demo-token" || plaintext.startsWith("fixture-");
}

/**
 * Sync now (org-scoped):
 * - No DB → noop
 * - No tokens → noop (suggest seed-fixtures)
 * - Fixture stub tokens → re-pull mocks into DB
 * - Real tokens → live Harvest/QBO HTTP → raw tables (+ optional name-match maps)
 */
export async function runSyncNow(organizationId?: string): Promise<SyncResult> {
  const orgId = organizationId ?? requireOrgId();

  if (!isDatabaseConfigured()) {
    return {
      provider: "both",
      status: "noop",
      message:
        "No DATABASE_URL. Sync is a no-op; brief stays on fixtures. See SPIKE-2.md.",
    };
  }

  const db = getDb();
  if (!db) {
    return {
      provider: "both",
      status: "noop",
      message: "Database unavailable.",
    };
  }

  let tokens: (typeof connectionTokens.$inferSelect)[] = [];
  try {
    tokens = await db
      .select()
      .from(connectionTokens)
      .where(eq(connectionTokens.organizationId, orgId));
  } catch {
    return {
      provider: "both",
      status: "noop",
      message: "Could not read connection_tokens (migrate first?).",
    };
  }

  if (tokens.length === 0) {
    return {
      provider: "both",
      status: "noop",
      message:
        "No OAuth tokens stored. Connect Harvest/QBO, or POST /api/sync/seed-fixtures for a local demo.",
    };
  }

  const range = syncLookbackRange(new Date(), 60);

  const harvestTok = tokens.find((t) => t.provider === "harvest");
  const qboTok = tokens.find((t) => t.provider === "qbo");

  const results: SyncResult[] = [];
  let didLivePull = false;

  if (harvestTok) {
    let plaintext = "";
    try {
      plaintext = decryptToken(harvestTok.accessTokenCipher);
    } catch {
      plaintext = "";
    }
    if (isFixtureToken(plaintext)) {
      results.push(await pullHarvest(createHarvestMock(), range, orgId));
    } else {
      try {
        const accessToken = await ensureFreshAccessToken(harvestTok);
        let accountId =
          harvestTok.realmId?.trim() ||
          process.env.HARVEST_ACCOUNT_ID?.trim() ||
          "";
        if (!accountId) {
          const acct = await fetchHarvestAccountId(accessToken);
          if (acct) {
            accountId = acct.accountId;
            await db
              .update(connectionTokens)
              .set({
                realmId: accountId,
                accountLabel: acct.name || harvestTok.accountLabel,
                updatedAt: new Date(),
              })
              .where(eq(connectionTokens.id, harvestTok.id));
          }
        }
        if (!accountId) {
          results.push({
            provider: "harvest",
            status: "error",
            message:
              "Harvest account id missing. Reconnect OAuth or set HARVEST_ACCOUNT_ID.",
          });
        } else {
          const connector = createHarvestHttp({
            accessToken,
            accountId,
          });
          results.push(await pullHarvest(connector, range, orgId));
          didLivePull = true;
        }
      } catch (err) {
        results.push({
          provider: "harvest",
          status: "error",
          message:
            err instanceof Error ? err.message : "Harvest live pull failed",
        });
      }
    }
  }

  if (qboTok) {
    let plaintext = "";
    try {
      plaintext = decryptToken(qboTok.accessTokenCipher);
    } catch {
      plaintext = "";
    }
    if (isFixtureToken(plaintext)) {
      results.push(await pullQbo(createQboMock(), range, orgId));
    } else {
      try {
        const realmId = qboTok.realmId?.trim();
        if (!realmId) {
          results.push({
            provider: "qbo",
            status: "error",
            message:
              "QBO realmId missing on token row. Reconnect via OAuth (callback stores realmId).",
          });
        } else {
          const accessToken = await ensureFreshAccessToken(qboTok);
          const connector = createQboHttp({ accessToken, realmId });
          results.push(await pullQbo(connector, range, orgId));
          didLivePull = true;
        }
      } catch (err) {
        results.push({
          provider: "qbo",
          status: "error",
          message: err instanceof Error ? err.message : "QBO live pull failed",
        });
      }
    }
  }

  if (didLivePull) {
    try {
      await maybeSuggestMaps(orgId);
    } catch {
      /* non-fatal */
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const err = results.filter((r) => r.status === "error").length;

  return {
    provider: "both",
    status: err > 0 ? "error" : ok > 0 ? "ok" : "noop",
    message: results.map((r) => `[${r.provider}] ${r.message}`).join(" · "),
    counts: results.reduce(
      (acc, r) => ({ ...acc, ...(r.counts ?? {}) }),
      {} as Record<string, number>
    ),
  };
}

async function maybeSuggestMaps(orgId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  const [existingClients, existingProjects] = await Promise.all([
    db
      .select()
      .from(clientIdentityMaps)
      .where(eq(clientIdentityMaps.organizationId, orgId)),
    db
      .select()
      .from(projectIdentityMaps)
      .where(eq(projectIdentityMaps.organizationId, orgId)),
  ]);

  const harvest = createHarvestFromDb(orgId);
  const qbo = createQboFromDb(orgId);
  const [hClients, hProjects, qCustomers, qJobs] = await Promise.all([
    harvest.listClients(),
    harvest.listProjects(),
    qbo.listCustomers(),
    qbo.listJobs(),
  ]);

  const clientMaps = suggestClientMaps(
    hClients,
    qCustomers,
    existingClients.map((c) => ({
      harvestClientId: c.harvestClientId,
      qboCustomerId: c.qboCustomerId,
      status: "mapped" as const,
    }))
  );
  const projectMaps = suggestProjectMaps(
    hProjects,
    qJobs,
    existingProjects.map((p) => ({
      harvestProjectId: p.harvestProjectId,
      qboJobId: p.qboJobId,
      status: "mapped" as const,
    }))
  );

  const now = new Date();
  const newClients = clientMaps.filter(
    (m) =>
      !existingClients.some((e) => e.harvestClientId === m.harvestClientId)
  );
  const newProjects = projectMaps.filter(
    (m) =>
      !existingProjects.some((e) => e.harvestProjectId === m.harvestProjectId)
  );

  if (newClients.length) {
    await db.insert(clientIdentityMaps).values(
      newClients.map((m) => ({
        id: newId("cmap"),
        organizationId: orgId,
        harvestClientId: m.harvestClientId,
        qboCustomerId: m.qboCustomerId,
        status: "mapped",
        updatedAt: now,
      }))
    );
  }
  if (newProjects.length) {
    await db.insert(projectIdentityMaps).values(
      newProjects.map((m) => ({
        id: newId("pmap"),
        organizationId: orgId,
        harvestProjectId: m.harvestProjectId,
        qboJobId: m.qboJobId,
        status: "mapped",
        updatedAt: now,
      }))
    );
  }
}

export async function hasAnyTokens(organizationId?: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const orgId = organizationId ?? requireOrgId();
  try {
    const rows = await db
      .select({ id: connectionTokens.id })
      .from(connectionTokens)
      .where(eq(connectionTokens.organizationId, orgId))
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function getTokenFor(
  provider: "harvest" | "qbo",
  organizationId?: string
) {
  const db = getDb();
  if (!db) return null;
  const orgId = organizationId ?? requireOrgId();
  try {
    const rows = await db
      .select()
      .from(connectionTokens)
      .where(
        and(
          eq(connectionTokens.organizationId, orgId),
          eq(connectionTokens.provider, provider)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
