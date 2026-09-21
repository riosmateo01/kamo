import { NextResponse } from "next/server";
import { listFabricObjects } from "@/lib/rfo";
import { isOrgResult, requireOrg } from "@/lib/auth/require-org";
import { runWithOrgAsync } from "@/lib/auth/org-context";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const org = await requireOrg();
  if (!isOrgResult(org)) return org;

  return runWithOrgAsync(org, async () => {
    const url = new URL(req.url);
    const limitRaw = url.searchParams.get("limit");
    const limit = Math.min(
      100,
      Math.max(1, limitRaw ? Number(limitRaw) || 50 : 50)
    );

    try {
      const objects = await listFabricObjects({
        kind: "margin_risk_exception",
        limit,
        organizationId: org.orgId,
      });

      return NextResponse.json({
        ok: true,
        count: objects.length,
        exceptions: objects.map((o) => ({
          id: o.id,
          title: o.title,
          status: o.status,
          createdAt: o.createdAt,
          playId: o.playId,
          payload: o.payload,
        })),
      });
    } catch (e) {
      return NextResponse.json(
        {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
          exceptions: [],
        },
        { status: 500 }
      );
    }
  });
}
