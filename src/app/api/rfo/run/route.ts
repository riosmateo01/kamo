import { NextResponse } from "next/server";
import { runPlay, type NotifyChannel, type PlayId } from "@/lib/rfo";
import { isOrgResult, requireOrg } from "@/lib/auth/require-org";
import { runWithOrgAsync } from "@/lib/auth/org-context";
import { enqueueJob } from "@/lib/jobs/queue";
import { appendAuditEvent } from "@/lib/audit/events";

export const dynamic = "force-dynamic";

const PLAYS: PlayId[] = ["monday_brief", "margin_risk"];
const NOTIFY: NotifyChannel[] = ["slack", "email", "none"];

export async function POST(req: Request) {
  const org = await requireOrg();
  if (!isOrgResult(org)) return org;

  return runWithOrgAsync(org, async () => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;
    const play = b.play as string | undefined;
    if (!play || !PLAYS.includes(play as PlayId)) {
      return NextResponse.json(
        {
          ok: false,
          error: `play must be one of: ${PLAYS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const notifyRaw = (b.notify as string | undefined) ?? "none";
    if (!NOTIFY.includes(notifyRaw as NotifyChannel)) {
      return NextResponse.json(
        { ok: false, error: `notify must be one of: ${NOTIFY.join(", ")}` },
        { status: 400 }
      );
    }

    const notify = notifyRaw as NotifyChannel;
    const wait = Boolean(b.wait);
    const asyncNotify = notify !== "none" && !wait && !b.dryRun;

    try {
      // Always run play synchronously for fabric/view; notifications may enqueue
      const result = await runPlay({
        play: play as PlayId,
        dryRun: Boolean(b.dryRun) || asyncNotify,
        notify: asyncNotify ? "none" : notify,
        period: typeof b.period === "string" ? b.period : undefined,
        start: typeof b.start === "string" ? b.start : undefined,
        end: typeof b.end === "string" ? b.end : undefined,
        organizationId: org.orgId,
      });

      let notifyJobId: string | undefined;
      if (asyncNotify) {
        const bucket = Math.floor(Date.now() / 60_000);
        const enqueued = await enqueueJob({
          organizationId: org.orgId,
          type: "notify",
          idempotencyKey: `notify:${org.orgId}:${play}:${notify}:${bucket}`,
          payload: {
            userId: org.userId,
            play,
            notify,
            dryRun: Boolean(b.dryRun),
            period: b.period,
            start: b.start,
            end: b.end,
          },
          actorUserId: org.userId,
        });
        if (!("error" in enqueued)) notifyJobId = enqueued.jobId;
      }

      await appendAuditEvent({
        organizationId: org.orgId,
        actorUserId: org.userId,
        action: "rfo.run",
        resource: `play:${play}`,
        meta: { notify, notifyJobId },
      });

      const fabricSummary = result.fabric.map((o) => ({
        id: o.id,
        kind: o.kind,
        title: o.title,
        status: o.status,
        createdAt: o.createdAt,
      }));

      return NextResponse.json({
        ok: true,
        play: result.play,
        notifyJobId,
        recon: {
          adapterId: result.recon.adapterId,
          notes: result.recon.notes,
          objectIds: result.recon.objects.map((o) => o.id),
        },
        fabric: fabricSummary,
        triggers: result.triggers,
        view:
          result.play === "margin_risk"
            ? result.view
            : result.view && "meta" in result.view
              ? {
                  meta: result.view.meta,
                  projectCount: result.view.pnl.projects.length,
                  clientCount: result.view.pnl.clients.length,
                  needsReview: result.view.pnl.needsReview.length,
                }
              : undefined,
      });
    } catch (e) {
      return NextResponse.json(
        {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        },
        { status: 500 }
      );
    }
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: 'POST { play: "monday_brief" | "margin_risk", dryRun?: boolean, notify?: "slack"|"email"|"none", wait?: boolean }',
  });
}
