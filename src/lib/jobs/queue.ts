/**
 * Idempotent background jobs (sync | notify).
 */
import { and, eq, lte } from "drizzle-orm";
import { getDb, markDbUnavailable } from "@/db/client";
import { jobs } from "@/db/schema";
import { newId } from "@/lib/sync/id";
import { runSyncNow } from "@/lib/sync/run-sync";
import { runWithOrgAsync } from "@/lib/auth/org-context";
import { appendAuditEvent } from "@/lib/audit/events";

export type JobType = "sync" | "notify";

export type EnqueueResult = {
  jobId: string;
  created: boolean;
  status: string;
};

export async function enqueueJob(input: {
  organizationId: string;
  type: JobType;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
  runAfter?: Date;
  actorUserId?: string | null;
}): Promise<EnqueueResult | { error: string }> {
  const db = getDb();
  if (!db) return { error: "database unavailable" };

  try {
    const existing = await db
      .select()
      .from(jobs)
      .where(eq(jobs.idempotencyKey, input.idempotencyKey))
      .limit(1);

    if (existing[0]) {
      return {
        jobId: existing[0].id,
        created: false,
        status: existing[0].status,
      };
    }

    const id = newId("job");
    const now = new Date();
    await db.insert(jobs).values({
      id,
      organizationId: input.organizationId,
      type: input.type,
      idempotencyKey: input.idempotencyKey,
      status: "pending",
      payload: input.payload ?? null,
      attempts: 0,
      runAfter: input.runAfter ?? now,
      createdAt: now,
      finishedAt: null,
    });

    await appendAuditEvent({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.type === "sync" ? "sync.enqueue" : "rfo.notify",
      resource: `job:${id}`,
      meta: { type: input.type, idempotencyKey: input.idempotencyKey },
    });

    return { jobId: id, created: true, status: "pending" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "enqueue failed";
    if (message.includes("unique") || message.includes("duplicate")) {
      try {
        const rows = await db
          .select()
          .from(jobs)
          .where(eq(jobs.idempotencyKey, input.idempotencyKey))
          .limit(1);
        if (rows[0]) {
          return {
            jobId: rows[0].id,
            created: false,
            status: rows[0].status,
          };
        }
      } catch {
        /* fall through */
      }
    }
    console.error("[jobs] enqueue", err);
    return { error: message };
  }
}

export async function processJob(jobId: string): Promise<{
  ok: boolean;
  status: string;
  message?: string;
}> {
  const db = getDb();
  if (!db) return { ok: false, status: "error", message: "no db" };

  const rows = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  const job = rows[0];
  if (!job) return { ok: false, status: "error", message: "not found" };

  if (job.status === "done") {
    return { ok: true, status: "done", message: "already done (idempotent)" };
  }

  await db
    .update(jobs)
    .set({
      status: "running",
      attempts: (job.attempts ?? 0) + 1,
    })
    .where(and(eq(jobs.id, jobId), eq(jobs.status, job.status)));

  const orgId = job.organizationId;
  const payload = (job.payload ?? {}) as Record<string, unknown>;
  const userId =
    typeof payload.userId === "string" ? payload.userId : "system";

  try {
    if (job.type === "sync") {
      const result = await runWithOrgAsync({ orgId, userId }, () =>
        runSyncNow(orgId)
      );
      const ok = result.status !== "error";
      await db
        .update(jobs)
        .set({
          status: ok ? "done" : "error",
          finishedAt: new Date(),
          payload: { ...payload, result },
        })
        .where(eq(jobs.id, jobId));
      await appendAuditEvent({
        organizationId: orgId,
        actorUserId: userId,
        action: "sync.run",
        resource: `job:${jobId}`,
        meta: { status: result.status, message: result.message },
      });
      return {
        ok,
        status: ok ? "done" : "error",
        message: result.message,
      };
    }

    if (job.type === "notify") {
      const { runPlay } = await import("@/lib/rfo");
      const play =
        (payload.play as "monday_brief" | "margin_risk") ?? "margin_risk";
      const notify =
        (payload.notify as "slack" | "email" | "none") ?? "slack";
      const result = await runWithOrgAsync({ orgId, userId }, () =>
        runPlay({
          play,
          notify,
          dryRun: Boolean(payload.dryRun),
          period:
            typeof payload.period === "string" ? payload.period : undefined,
          start: typeof payload.start === "string" ? payload.start : undefined,
          end: typeof payload.end === "string" ? payload.end : undefined,
          organizationId: orgId,
        })
      );
      await db
        .update(jobs)
        .set({
          status: "done",
          finishedAt: new Date(),
          payload: {
            ...payload,
            triggerCount: result.triggers?.length ?? 0,
          },
        })
        .where(eq(jobs.id, jobId));
      await appendAuditEvent({
        organizationId: orgId,
        actorUserId: userId,
        action: "rfo.notify",
        resource: `job:${jobId}`,
        meta: { play, notify, triggers: result.triggers?.length ?? 0 },
      });
      return { ok: true, status: "done" };
    }

    await db
      .update(jobs)
      .set({ status: "error", finishedAt: new Date() })
      .where(eq(jobs.id, jobId));
    return { ok: false, status: "error", message: `unknown type ${job.type}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "job failed";
    try {
      await db
        .update(jobs)
        .set({
          status: "error",
          finishedAt: new Date(),
          payload: { ...payload, error: message },
        })
        .where(eq(jobs.id, jobId));
    } catch {
      markDbUnavailable();
    }
    return { ok: false, status: "error", message };
  }
}

export async function drainJobs(opts?: {
  organizationId?: string;
  limit?: number;
}): Promise<{
  processed: number;
  results: Array<{ jobId: string; status: string }>;
}> {
  const db = getDb();
  if (!db) return { processed: 0, results: [] };

  const limit = opts?.limit ?? 10;
  const now = new Date();

  try {
    const pending = opts?.organizationId
      ? await db
          .select()
          .from(jobs)
          .where(
            and(
              eq(jobs.status, "pending"),
              eq(jobs.organizationId, opts.organizationId),
              lte(jobs.runAfter, now)
            )
          )
          .limit(limit)
      : await db
          .select()
          .from(jobs)
          .where(and(eq(jobs.status, "pending"), lte(jobs.runAfter, now)))
          .limit(limit);

    const results: Array<{ jobId: string; status: string }> = [];
    for (const job of pending) {
      const r = await processJob(job.id);
      results.push({ jobId: job.id, status: r.status });
    }
    return { processed: results.length, results };
  } catch (err) {
    console.error("[jobs] drain", err);
    return { processed: 0, results: [] };
  }
}

export async function getJob(jobId: string, organizationId?: string) {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);
    const job = rows[0];
    if (!job) return null;
    if (organizationId && job.organizationId !== organizationId) return null;
    return job;
  } catch {
    return null;
  }
}
