import { NextResponse } from "next/server";
import { drainJobs } from "@/lib/jobs/queue";
import { isOrgResult, requireOrg } from "@/lib/auth/require-org";
import { appendAuditEvent } from "@/lib/audit/events";

export const dynamic = "force-dynamic";

/**
 * POST /api/jobs/drain
 * Auth: Clerk org OR Authorization: Bearer <CRON_SECRET> / x-cron-secret header.
 */
export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = req.headers.get("authorization");
  const cronHeader = req.headers.get("x-cron-secret");
  const bearer =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const isCron =
    Boolean(cronSecret) &&
    (bearer === cronSecret || cronHeader === cronSecret);

  let organizationId: string | undefined;
  let actorUserId: string | null = null;

  if (!isCron) {
    const org = await requireOrg();
    if (!isOrgResult(org)) return org;
    organizationId = org.orgId;
    actorUserId = org.userId;
  }

  let limit = 10;
  try {
    const body = (await req.json().catch(() => ({}))) as { limit?: number };
    if (typeof body.limit === "number" && body.limit > 0) {
      limit = Math.min(50, Math.floor(body.limit));
    }
  } catch {
    /* empty OK */
  }

  const result = await drainJobs({ organizationId, limit });

  await appendAuditEvent({
    organizationId: organizationId ?? "system",
    actorUserId,
    action: "jobs.drain",
    resource: "jobs",
    meta: { processed: result.processed, cron: isCron },
  });

  return NextResponse.json({ ok: true, ...result });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST to drain pending jobs. Auth: org session or CRON_SECRET header.",
  });
}
