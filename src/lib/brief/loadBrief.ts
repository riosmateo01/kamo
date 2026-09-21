import { createHarvestMock } from "@/lib/connectors/harvest/mock";
import { createQboMock } from "@/lib/connectors/qbo/mock";
import { createHarvestFromDb } from "@/lib/connectors/harvest/from-db";
import { createQboFromDb } from "@/lib/connectors/qbo/from-db";
import { mappingService } from "@/lib/mapping/resolve";
import { pnlReconciler } from "@/lib/pnl/reconcile";
import type {
  ClientMap,
  HarvestConnector,
  ProjectMap,
  QboConnector,
  ReconciledPnL,
} from "@/lib/contracts/types";
import mappingFixture from "@/lib/fixtures/mapping.json";
import { getDb } from "@/db/client";
import {
  clientIdentityMaps,
  projectIdentityMaps,
} from "@/db/schema";
import { hasRecentLiveSync } from "@/lib/sync/connections";
import { eq } from "drizzle-orm";
import { getOrgIdOrNull } from "@/lib/auth/org-context";
import {
  resolvePeriods,
  type PeriodKey,
  type ResolvePeriodInput,
} from "./period";

export type BriefSource = "fixtures" | "live";

export type BriefMeta = {
  periodLabel: string;
  priorPeriodLabel: string;
  generatedAt: string;
  source: BriefSource;
  /** Extra detail for badge / freshness line */
  sourceDetail?: string;
  periodKey: PeriodKey;
  periodPresetLabel: string;
};

export type BriefPayload = {
  pnl: ReconciledPnL;
  meta: BriefMeta;
};

export type LoadBriefOptions = ResolvePeriodInput;

function labelRange(start: string, end: string): string {
  return `${start} → ${end}`;
}

async function loadMapsFromDb(organizationId?: string): Promise<{
  clientMaps: ClientMap[];
  projectMaps: ProjectMap[];
} | null> {
  const db = getDb();
  if (!db) return null;
  const orgId = organizationId ?? getOrgIdOrNull();
  if (!orgId) return null;
  try {
    const [clients, projects] = await Promise.all([
      db.select().from(clientIdentityMaps).where(eq(clientIdentityMaps.organizationId, orgId)),
      db.select().from(projectIdentityMaps).where(eq(projectIdentityMaps.organizationId, orgId)),
    ]);
    if (clients.length === 0 && projects.length === 0) return null;
    return {
      clientMaps: clients.map((c) => ({
        harvestClientId: c.harvestClientId,
        qboCustomerId: c.qboCustomerId,
        status: "mapped" as const,
      })),
      projectMaps: projects.map((p) => ({
        harvestProjectId: p.harvestProjectId,
        qboJobId: p.qboJobId,
        status: "mapped" as const,
      })),
    };
  } catch {
    return null;
  }
}

async function runPipeline(
  harvest: HarvestConnector,
  qbo: QboConnector,
  maps: { clientMaps: ClientMap[]; projectMaps: ProjectMap[] },
  source: BriefSource,
  opts: LoadBriefOptions,
  sourceDetail?: string
): Promise<BriefPayload> {
  const resolved = resolvePeriods({
    ...opts,
    fixtureAligned: source === "fixtures",
  });
  const period = resolved.current;
  const priorPeriod = resolved.prior;

  const [clients, projects, customers, jobs, revenueLines, allTime] =
    await Promise.all([
      harvest.listClients(),
      harvest.listProjects(),
      qbo.listCustomers(),
      qbo.listJobs(),
      qbo.listRevenue({ start: priorPeriod.start, end: period.end }),
      harvest.listTimeEntries({
        start: priorPeriod.start,
        end: period.end,
      }),
    ]);

  const snapshot = mappingService.resolve({
    harvestClients: clients,
    harvestProjects: projects,
    qboCustomers: customers,
    qboJobs: jobs,
    clientMaps: maps.clientMaps,
    projectMaps: maps.projectMaps,
  });

  const pnl = pnlReconciler.reconcile({
    period,
    priorPeriod,
    timeEntries: allTime,
    revenueLines,
    mapping: snapshot,
    projects,
    clients,
  });

  return {
    pnl,
    meta: {
      periodLabel: labelRange(period.start, period.end),
      priorPeriodLabel: labelRange(priorPeriod.start, priorPeriod.end),
      generatedAt: new Date().toISOString(),
      source,
      sourceDetail,
      periodKey: resolved.key,
      periodPresetLabel: resolved.label,
    },
  };
}

/**
 * Spike 0 fixture pipeline — always available, no DB required.
 * Uses fixture-aligned last_week (2026-09-08…14) unless period/mtd/custom set.
 */
export async function loadFixtureBrief(
  opts: LoadBriefOptions = {}
): Promise<BriefPayload> {
  return runPipeline(
    createHarvestMock(),
    createQboMock(),
    {
      clientMaps: mappingFixture.clientMaps as ClientMap[],
      projectMaps: mappingFixture.projectMaps as ProjectMap[],
    },
    "fixtures",
    opts,
    "sandbox JSON"
  );
}

/**
 * Connector switch: live DB-synced data when connections/sync exist + recent;
 * otherwise fixtures. Badge must reflect meta.source accurately.
 */
export async function loadBrief(
  opts: LoadBriefOptions & { organizationId?: string } = {}
): Promise<BriefPayload> {
  const orgId = opts.organizationId ?? getOrgIdOrNull() ?? undefined;
  const live = await hasRecentLiveSync(orgId);
  if (!live.ok) {
    const fixture = await loadFixtureBrief(opts);
    return {
      ...fixture,
      meta: {
        ...fixture.meta,
        sourceDetail: live.reason,
      },
    };
  }

  const maps =
    (await loadMapsFromDb(orgId)) ?? {
      clientMaps: mappingFixture.clientMaps as ClientMap[],
      projectMaps: mappingFixture.projectMaps as ProjectMap[],
    };

  try {
    return await runPipeline(
      createHarvestFromDb(orgId),
      createQboFromDb(orgId),
      maps,
      "live",
      opts,
      live.lastSyncedAt
        ? `synced ${live.lastSyncedAt}`
        : "db-synced raw tables"
    );
  } catch {
    return loadFixtureBrief(opts);
  }
}
