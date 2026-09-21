import type {
  DateRange,
  HarvestClient,
  HarvestConnector,
  HarvestProject,
  HarvestTimeEntry,
} from "@/lib/contracts/types";
import { getDb } from "@/db/client";
import {
  harvestRawClients,
  harvestRawProjects,
  harvestRawTimeEntries,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrgIdOrNull, requireOrgId } from "@/lib/auth/org-context";

function inRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

export function createHarvestFromDb(organizationId?: string): HarvestConnector {
  const resolveOrg = () => organizationId ?? getOrgIdOrNull() ?? requireOrgId();

  return {
    async listClients(): Promise<HarvestClient[]> {
      const db = getDb();
      if (!db) return [];
      const orgId = resolveOrg();
      const rows = await db
        .select()
        .from(harvestRawClients)
        .where(eq(harvestRawClients.organizationId, orgId));
      return rows.map((r) => r.payload as HarvestClient);
    },
    async listProjects(): Promise<HarvestProject[]> {
      const db = getDb();
      if (!db) return [];
      const orgId = resolveOrg();
      const rows = await db
        .select()
        .from(harvestRawProjects)
        .where(eq(harvestRawProjects.organizationId, orgId));
      return rows.map((r) => r.payload as HarvestProject);
    },
    async listTimeEntries(range: DateRange): Promise<HarvestTimeEntry[]> {
      const db = getDb();
      if (!db) return [];
      const orgId = resolveOrg();
      const rows = await db
        .select()
        .from(harvestRawTimeEntries)
        .where(eq(harvestRawTimeEntries.organizationId, orgId));
      return rows
        .map((r) => r.payload as HarvestTimeEntry)
        .filter((e) => inRange(e.date, range));
    },
  };
}
