import { NextRequest, NextResponse } from "next/server";
import { seedFixturesToDb } from "@/lib/sync";
import { isOrgResult, requireOrg } from "@/lib/auth/require-org";
import { runWithOrgAsync } from "@/lib/auth/org-context";
import { appendAuditEvent } from "@/lib/audit/events";

export const dynamic = "force-dynamic";

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

export async function POST(req: NextRequest) {
  if (isProductionRuntime()) {
    await appendAuditEvent({
      organizationId: "system",
      actorUserId: null,
      action: "seed.blocked",
      resource: "seed-fixtures",
      meta: { reason: "production" },
    });
    return NextResponse.json(
      { error: "Fixture seeding is disabled in production", code: "forbidden" },
      { status: 403 }
    );
  }

  const org = await requireOrg();
  if (!isOrgResult(org)) return org;

  return runWithOrgAsync(org, async () => {
    let stubTokens = true;
    try {
      const body = (await req.json()) as { stubTokens?: boolean };
      if (typeof body.stubTokens === "boolean") stubTokens = body.stubTokens;
    } catch {
      /* empty body OK */
    }

    const result = await seedFixturesToDb({
      stubTokens,
      organizationId: org.orgId,
    });

    await appendAuditEvent({
      organizationId: org.orgId,
      actorUserId: org.userId,
      action: "seed.run",
      resource: "seed-fixtures",
      meta: { status: result.status },
    });

    return NextResponse.json(result, {
      status: result.status === "error" ? 500 : 200,
    });
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST to seed fixtures (non-production + auth/org). Body optional: { stubTokens?: boolean }.",
  });
}
