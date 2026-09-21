import type { DateRange, QboConnector } from "@/lib/contracts/types";
import { getDb, markDbUnavailable } from "@/db/client";
import {
  qboRawCustomers,
  qboRawJobs,
  qboRawRevenueLines,
  syncRuns,
} from "@/db/schema";
import type { SyncResult } from "./types";
import { newId } from "./id";
import { eq } from "drizzle-orm";
import { requireOrgId } from "@/lib/auth/org-context";

export async function pullQbo(
  connector: QboConnector,
  range: DateRange,
  organizationId?: string
): Promise<SyncResult> {
  const db = getDb();
  if (!db) {
    return {
      provider: "qbo",
      status: "noop",
      message: "No database — set DATABASE_URL and migrate before syncing.",
    };
  }

  const orgId = organizationId ?? requireOrgId();
  const runId = newId("sync");
  const started = new Date();

  try {
    const [customers, jobs, revenueLines] = await Promise.all([
      connector.listCustomers(),
      connector.listJobs(),
      connector.listRevenue(range),
    ]);
    const now = new Date();

    await db
      .delete(qboRawCustomers)
      .where(eq(qboRawCustomers.organizationId, orgId));
    await db.delete(qboRawJobs).where(eq(qboRawJobs.organizationId, orgId));
    await db
      .delete(qboRawRevenueLines)
      .where(eq(qboRawRevenueLines.organizationId, orgId));

    if (customers.length) {
      await db.insert(qboRawCustomers).values(
        customers.map((c) => ({
          organizationId: orgId,
          id: c.id,
          payload: c,
          syncedAt: now,
        }))
      );
    }
    if (jobs.length) {
      await db.insert(qboRawJobs).values(
        jobs.map((j) => ({
          organizationId: orgId,
          id: j.id,
          payload: j,
          syncedAt: now,
        }))
      );
    }
    if (revenueLines.length) {
      await db.insert(qboRawRevenueLines).values(
        revenueLines.map((r) => ({
          organizationId: orgId,
          id: r.id,
          payload: r,
          date: r.date,
          syncedAt: now,
        }))
      );
    }

    await db.insert(syncRuns).values({
      id: runId,
      organizationId: orgId,
      provider: "qbo",
      status: "ok",
      message: `Pulled ${customers.length} customers, ${jobs.length} jobs, ${revenueLines.length} revenue lines`,
      startedAt: started,
      finishedAt: new Date(),
    });

    return {
      provider: "qbo",
      status: "ok",
      message: "QBO pull complete",
      counts: {
        customers: customers.length,
        jobs: jobs.length,
        revenueLines: revenueLines.length,
      },
    };
  } catch (err) {
    markDbUnavailable();
    const message = err instanceof Error ? err.message : "QBO pull failed";
    try {
      await db.insert(syncRuns).values({
        id: runId,
        organizationId: orgId,
        provider: "qbo",
        status: "error",
        message,
        startedAt: started,
        finishedAt: new Date(),
      });
    } catch {
      /* ignore */
    }
    return { provider: "qbo", status: "error", message };
  }
}
