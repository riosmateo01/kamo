/**
 * Optional name-match auto-suggest for identity maps.
 * Exact case-insensitive name match only — no fuzzy merge without review.
 */

import type {
  ClientMap,
  HarvestClient,
  HarvestProject,
  ProjectMap,
  QboCustomer,
  QboJob,
} from "@/lib/contracts/types";

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function suggestClientMaps(
  harvestClients: HarvestClient[],
  qboCustomers: QboCustomer[],
  existing: ClientMap[] = []
): ClientMap[] {
  const takenQbo = new Set(existing.map((m) => m.qboCustomerId));
  const takenHarvest = new Set(existing.map((m) => m.harvestClientId));
  const byName = new Map(qboCustomers.map((c) => [norm(c.displayName), c]));
  const out: ClientMap[] = [...existing];

  for (const h of harvestClients) {
    if (takenHarvest.has(h.id)) continue;
    const match = byName.get(norm(h.name));
    if (!match || takenQbo.has(match.id)) continue;
    out.push({
      harvestClientId: h.id,
      qboCustomerId: match.id,
      status: "mapped",
    });
    takenQbo.add(match.id);
    takenHarvest.add(h.id);
  }
  return out;
}

export function suggestProjectMaps(
  harvestProjects: HarvestProject[],
  qboJobs: QboJob[],
  existing: ProjectMap[] = []
): ProjectMap[] {
  const takenQbo = new Set(existing.map((m) => m.qboJobId));
  const takenHarvest = new Set(existing.map((m) => m.harvestProjectId));
  const byName = new Map(
    qboJobs.map((j) => [norm(j.displayName), j])
  );
  // Also try last segment of FullyQualifiedName "Parent:Job"
  for (const j of qboJobs) {
    if (j.fullyQualifiedName?.includes(":")) {
      const leaf = j.fullyQualifiedName.split(":").pop();
      if (leaf) byName.set(norm(leaf), j);
    }
  }

  const out: ProjectMap[] = [...existing];
  for (const h of harvestProjects) {
    if (takenHarvest.has(h.id)) continue;
    const match = byName.get(norm(h.name));
    if (!match || takenQbo.has(match.id)) continue;
    out.push({
      harvestProjectId: h.id,
      qboJobId: match.id,
      status: "mapped",
    });
    takenQbo.add(match.id);
    takenHarvest.add(h.id);
  }
  return out;
}
