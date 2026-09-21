import { NextResponse } from "next/server";
import { isOrgResult, requireOrg } from "@/lib/auth/require-org";
import { runWithOrgAsync } from "@/lib/auth/org-context";
import { enqueueJob, getJob, processJob } from "@/lib/jobs/queue";

export const dynamic = "force-dynamic";

/**
 * POST /api/sync — enqueue idempotent sync job; returns job id.
 * Body optional: { wait?: boolean } — when true, process immediately (local DX).
 */
export async function POST(req: Request) {
  const org = await requireOrg();
  if (!isOrgResult(org)) return org;

  return runWithOrgAsync(org, async () => {
    let wait = false;
    try {
      const body = (await req.json().catch(() => ({}))) as { wait?: boolean };
      wait = Boolean(body.wait);
    } catch {
      /* empty OK */
    }

    // Idempotency: one pending/running sync per org per hour bucket
    const hourBucket = Math.floor(Date.now() / 3_600_000);
    const idempotencyKey = `sync:${org.orgId}:${hourBucket}`;

    const enqueued = await enqueueJob({
      organizationId: org.orgId,
      type: "sync",
      idempotencyKey,
      payload: { userId: org.userId },
      actorUserId: org.userId,
    });

    if ("error" in enqueued) {
      return NextResponse.json(
        { error: enqueued.error, status: "error" },
        { status: 500 }
      );
    }

    if (wait) {
      const result = await processJob(enqueued.jobId);
      const job = await getJob(enqueued.jobId, org.orgId);
      return NextResponse.json({
        jobId: enqueued.jobId,
        enqueued: enqueued.created,
        status: result.status,
        message: result.message,
        result: job?.payload,
      });
    }

    return NextResponse.json({
      jobId: enqueued.jobId,
      enqueued: enqueued.created,
      status: enqueued.status,
      hint: "Poll job via POST /api/jobs/drain or pass { wait: true } for local DX",
    });
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint:
      "POST to enqueue sync (auth + org required). Body optional: { wait?: boolean }. See PHASE-1.md.",
  });
}
