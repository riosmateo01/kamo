import { NextResponse } from "next/server";
import { requireOrg, isOrgResult } from "@/lib/auth/require-org";
import { runWithOrgAsync } from "@/lib/auth/org-context";
import { appendAuditEvent } from "@/lib/audit/events";
import { loadBrief, parsePeriodKey } from "@/lib/brief";
import { executeAskQuery, planQuestion } from "@/lib/ask/query";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const org = await requireOrg();
  if (!isOrgResult(org)) return org;

  return runWithOrgAsync(org, async () => {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }
    if (typeof body.question !== "string") {
      return NextResponse.json({ ok: false, error: "question is required" }, { status: 400 });
    }

    try {
      const query = planQuestion(body.question);
      const brief = await loadBrief({
        organizationId: org.orgId,
        period: parsePeriodKey(typeof body.period === "string" ? body.period : undefined),
        start: typeof body.start === "string" ? body.start : undefined,
        end: typeof body.end === "string" ? body.end : undefined,
      });
      const result = executeAskQuery(query, brief.pnl);
      await appendAuditEvent({
        organizationId: org.orgId,
        actorUserId: org.userId,
        action: "ask.query",
        resource: `metric:${query.measure}`,
        meta: { query, source: brief.meta.source },
      });
      return NextResponse.json({ ok: true, ...result, meta: brief.meta });
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: error instanceof Error ? error.message : "Question failed" },
        { status: 400 }
      );
    }
  });
}
