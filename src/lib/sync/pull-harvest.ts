import type { DateRange, HarvestConnector } from "@/lib/contracts/types";
import { getDb, markDbUnavailable } from "@/db/client";
import {
  harvestRawClients,
  harvestRawProjects,
  harvestRawTimeEntries,
  syncRuns,
} from "@/db/schema";
import type { SyncResult } from "./types";
import { newId } from "./id";
import { eq } from "drizzle-orm";
import { requireOrgId } from "@/lib/auth/org-context";

export async function pullHarvest(
  connector: HarvestConnector,
  range: DateRange,
  organizationId?: string
): Promise<SyncResult> {
  const db = getDb();
  if (!db) {
    return {
      provider: "harvest",
      status: "noop",
      message: "No database — set DATABASE_URL and migrate before syncing.",
    };
  }

  const orgId = organizationId ?? requireOrgId();
  const runId = newId("sync");
  const started = new Date();

  try {
    const [clients, projects, timeEntries] = await Promise.all([
      connector.listClients(),
      connector.listProjects(),
      connector.listTimeEntries(range),
    ]);
    const now = new Date();

    await db
      .delete(harvestRawClients)
      .where(eq(harvestRawClients.organizationId, orgId));
    await db
      .delete(harvestRawProjects)
      .where(eq(harvestRawProjects.organizationId, orgId));
    await db
      .delete(harvestRawTimeEntries)
      .where(eq(harvestRawTimeEntries.organizationId, orgId));

    if (clients.length) {
      await db.insert(harvestRawClients).values(
        clients.map((c) => ({
          organizationId: orgId,
          id: c.id,
          payload: c,
          syncedAt: now,
        }))
      );
    }
    if (projects.length) {
      await db.insert(harvestRawProjects).values(
        projects.map((p) => ({
          organizationId: orgId,
          id: p.id,
          payload: p,
          syncedAt: now,
        }))
      );
    }
    if (timeEntries.length) {
      await db.insert(harvestRawTimeEntries).values(
        timeEntries.map((e) => ({
          organizationId: orgId,
          id: e.id,
          payload: e,
          date: e.date,
          syncedAt: now,
        }))
      );
    }

    await db.insert(syncRuns).values({
      id: runId,
      organizationId: orgId,
      provider: "harvest",
      status: "ok",
      message: `Pulled ${clients.length} clients, ${projects.length} projects, ${timeEntries.length} time entries`,
      startedAt: started,
      finishedAt: new Date(),
    });

    return {
      provider: "harvest",
      status: "ok",
      message: "Harvest pull complete",
      counts: {
        clients: clients.length,
        projects: projects.length,
        timeEntries: timeEntries.length,
      },
    };
  } catch (err) {
    markDbUnavailable();
    const message = err instanceof Error ? err.message : "Harvest pull failed";
    try {
      await db.insert(syncRuns).values({
        id: runId,
        organizationId: orgId,
        provider: "harvest",
        status: "error",
        message,
        startedAt: started,
        finishedAt: new Date(),
      });
    } catch {
      /* ignore */
    }
    return { provider: "harvest", status: "error", message };
  }
}
