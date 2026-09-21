import type {
  ClientMap,
  HarvestClient,
  HarvestProject,
  MappingService,
  MappingSnapshot,
  ProjectMap,
  QboCustomer,
  QboJob,
  UnmatchedEntity,
} from "@/lib/contracts/types";

export const mappingService: MappingService = {
  resolve({
    harvestClients,
    harvestProjects,
    clientMaps,
    projectMaps,
  }): MappingSnapshot {
    const clientMapByHarvest = new Map(
      clientMaps.map((m) => [m.harvestClientId, m])
    );
    const projectMapByHarvest = new Map(
      projectMaps.map((m) => [m.harvestProjectId, m])
    );

    const unmatched: UnmatchedEntity[] = [];

    for (const c of harvestClients) {
      if (!clientMapByHarvest.has(c.id)) {
        unmatched.push({
          source: "harvest",
          entityType: "client",
          id: c.id,
          reason: "no QBO customer",
        });
      }
    }

    for (const p of harvestProjects) {
      if (!projectMapByHarvest.has(p.id)) {
        unmatched.push({
          source: "harvest",
          entityType: "project",
          id: p.id,
          reason: clientMapByHarvest.has(p.clientId)
            ? "no QBO job"
            : "client unmapped; no QBO job",
        });
      }
    }

    // QBO-only entities can be added later; Spike 0 fixtures are Harvest-driven.
    void 0 as unknown as QboCustomer;
    void 0 as unknown as QboJob;

    return {
      clients: clientMaps.filter((m) => m.status === "mapped") as ClientMap[],
      projects: projectMaps.filter((m) => m.status === "mapped") as ProjectMap[],
      unmatched,
    };
  },
};
