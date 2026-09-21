/**
 * Read-only unmatched Harvest clients/projects for the mapping settings page.
 * Exact-name Sync auto-maps; this list is informational.
 */

import { createHarvestMock } from "@/lib/connectors/harvest/mock";
import { createHarvestFromDb } from "@/lib/connectors/harvest/from-db";
import { mappingService } from "@/lib/mapping/resolve";
import type {
  ClientMap,
  HarvestClient,
  HarvestProject,
  ProjectMap,
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
import type { BriefSource } from "@/lib/brief/loadBrief";

export type UnmatchedClientRow = {
  id: string;
  name: string;
  reason: string;
};

export type UnmatchedProjectRow = {
  id: string;
  name: string;
  clientId: string;
  clientName: string | null;
  reason: string;
};

export type MappingView = {
  source: BriefSource;
  sourceDetail?: string;
  mappedClientCount: number;
  mappedProjectCount: number;
  unmatchedClients: UnmatchedClientRow[];
  unmatchedProjects: UnmatchedProjectRow[];
};

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

function buildView(
  harvestClients: HarvestClient[],
  harvestProjects: HarvestProject[],
  maps: { clientMaps: ClientMap[]; projectMaps: ProjectMap[] },
  source: BriefSource,
  sourceDetail?: string
): MappingView {
  // QBO lists only needed for MappingService signature; unmatched is Harvest-driven.
  const snapshot = mappingService.resolve({
    harvestClients,
    harvestProjects,
    qboCustomers: [],
    qboJobs: [],
    clientMaps: maps.clientMaps,
    projectMaps: maps.projectMaps,
  });

  const clientById = new Map(harvestClients.map((c) => [c.id, c]));
  const projectById = new Map(harvestProjects.map((p) => [p.id, p]));

  const unmatchedClients: UnmatchedClientRow[] = [];
  const unmatchedProjects: UnmatchedProjectRow[] = [];

  for (const u of snapshot.unmatched) {
    if (u.entityType === "client") {
      unmatchedClients.push({
        id: u.id,
        name: clientById.get(u.id)?.name ?? u.id,
        reason: u.reason,
      });
    } else if (u.entityType === "project") {
      const proj = projectById.get(u.id);
      unmatchedProjects.push({
        id: u.id,
        name: proj?.name ?? u.id,
        clientId: proj?.clientId ?? "",
        clientName: proj ? clientById.get(proj.clientId)?.name ?? null : null,
        reason: u.reason,
      });
    }
  }

  return {
    source,
    sourceDetail,
    mappedClientCount: snapshot.clients.length,
    mappedProjectCount: snapshot.projects.length,
    unmatchedClients,
    unmatchedProjects,
  };
}

export async function loadMappingView(organizationId?: string): Promise<MappingView> {
  const orgId = organizationId ?? getOrgIdOrNull() ?? undefined;
  const live = await hasRecentLiveSync(orgId);
  const fixtureMaps = {
    clientMaps: mappingFixture.clientMaps as ClientMap[],
    projectMaps: mappingFixture.projectMaps as ProjectMap[],
  };

  if (!live.ok) {
    const harvest = createHarvestMock();
    const [clients, projects] = await Promise.all([
      harvest.listClients(),
      harvest.listProjects(),
    ]);
    return buildView(clients, projects, fixtureMaps, "fixtures", live.reason);
  }

  const maps = (await loadMapsFromDb(orgId)) ?? fixtureMaps;

  try {
    const harvest = createHarvestFromDb(orgId);
    const [clients, projects] = await Promise.all([
      harvest.listClients(),
      harvest.listProjects(),
    ]);
    return buildView(
      clients,
      projects,
      maps,
      "live",
      live.lastSyncedAt ? `synced ${live.lastSyncedAt}` : "db-synced"
    );
  } catch {
    const harvest = createHarvestMock();
    const [clients, projects] = await Promise.all([
      harvest.listClients(),
      harvest.listProjects(),
    ]);
    return buildView(
      clients,
      projects,
      fixtureMaps,
      "fixtures",
      "live load failed; showing fixtures"
    );
  }
}
