/**
 * Seed fixture JSON into raw sync + identity map tables for local demos
 * without OAuth credentials. Disabled in production.
 */

import { getDb, isDatabaseConfigured, markDbUnavailable } from "@/db/client";
import {
  clientIdentityMaps,
  projectIdentityMaps,
  syncRuns,
  connectionTokens,
} from "@/db/schema";
import { createHarvestMock } from "@/lib/connectors/harvest/mock";
import { createQboMock } from "@/lib/connectors/qbo/mock";
import mappingFixture from "@/lib/fixtures/mapping.json";
import expected from "@/lib/fixtures/expected-pnl.json";
import { encryptToken } from "@/lib/auth/crypto";
import type { SyncResult } from "./types";
import { newId } from "./id";
import { pullHarvest } from "./pull-harvest";
import { pullQbo } from "./pull-qbo";
import { eq } from "drizzle-orm";
import { requireOrgId } from "@/lib/auth/org-context";

export async function seedFixturesToDb(opts?: {
  stubTokens?: boolean;
  organizationId?: string;
}): Promise<SyncResult> {
  const orgId = opts?.organizationId ?? requireOrgId();

  if (!isDatabaseConfigured()) {
    return {
      provider: "seed",
      status: "noop",
      message:
        "DATABASE_URL not set. UI stays on fixtures. Start Postgres and re-run seed.",
    };
  }

  const db = getDb();
  if (!db) {
    return {
      provider: "seed",
      status: "noop",
      message: "Database unavailable.",
    };
  }

  const period = expected.current.period;
  const priorPeriod = { start: "2026-09-01", end: "2026-09-07" };
  const range = { start: priorPeriod.start, end: period.end };

  const harvest = createHarvestMock();
  const qbo = createQboMock();

  const h = await pullHarvest(harvest, range, orgId);
  const q = await pullQbo(qbo, range, orgId);

  if (h.status === "error" || q.status === "error") {
    return {
      provider: "seed",
      status: "error",
      message: `Seed partial failure — harvest: ${h.message}; qbo: ${q.message}`,
    };
  }

  try {
    await db
      .delete(clientIdentityMaps)
      .where(eq(clientIdentityMaps.organizationId, orgId));
    await db
      .delete(projectIdentityMaps)
      .where(eq(projectIdentityMaps.organizationId, orgId));

    const now = new Date();
    await db.insert(clientIdentityMaps).values(
      (mappingFixture.clientMaps as Array<{
        harvestClientId: string;
        qboCustomerId: string;
        status: string;
      }>).map((m) => ({
        id: newId("cmap"),
        organizationId: orgId,
        harvestClientId: m.harvestClientId,
        qboCustomerId: m.qboCustomerId,
        status: m.status,
        updatedAt: now,
      }))
    );
    await db.insert(projectIdentityMaps).values(
      (mappingFixture.projectMaps as Array<{
        harvestProjectId: string;
        qboJobId: string;
        status: string;
      }>).map((m) => ({
        id: newId("pmap"),
        organizationId: orgId,
        harvestProjectId: m.harvestProjectId,
        qboJobId: m.qboJobId,
        status: m.status,
        updatedAt: now,
      }))
    );

    if (opts?.stubTokens !== false) {
      await db
        .delete(connectionTokens)
        .where(eq(connectionTokens.organizationId, orgId));
      for (const provider of ["harvest", "qbo"] as const) {
        await db.insert(connectionTokens).values({
          id: newId("tok"),
          organizationId: orgId,
          provider,
          accountLabel: `Fixture ${provider}`,
          accessTokenCipher: encryptToken("fixture-demo-token"),
          refreshTokenCipher: encryptToken("fixture-demo-refresh"),
          realmId: provider === "qbo" ? "fixture-realm" : null,
          scopes: "demo",
          updatedAt: now,
        });
      }
    }

    await db.insert(syncRuns).values({
      id: newId("sync"),
      organizationId: orgId,
      provider: "seed",
      status: "ok",
      message: "Fixtures seeded into raw tables + identity maps",
      startedAt: now,
      finishedAt: new Date(),
    });

    return {
      provider: "seed",
      status: "ok",
      message: "Fixtures seeded into DB. Brief can use live mode after refresh.",
      counts: {
        ...(h.counts ?? {}),
        ...(q.counts ?? {}),
        clientMaps: mappingFixture.clientMaps.length,
        projectMaps: mappingFixture.projectMaps.length,
      },
    };
  } catch (err) {
    markDbUnavailable();
    return {
      provider: "seed",
      status: "error",
      message: err instanceof Error ? err.message : "Seed failed",
    };
  }
}
