import { AppShell } from "@/components/AppShell";
import { CannedPrompts } from "@/components/brief/CannedPrompts";
import { loadBrief, parsePeriodKey } from "@/lib/brief";
import { withOrgPage } from "@/lib/auth/with-org";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function CannedPromptsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return withOrgPage(async (ctx) => {
  const sp = await searchParams;
  const period = parsePeriodKey(first(sp.period));
  const start = first(sp.start);
  const end = first(sp.end);
  const { pnl, meta } = await loadBrief({ period, start, end, organizationId: ctx.orgId });

  return (
    <AppShell
      title="Canned prompts"
      source={meta.source}
      current="prompts"
      subtitle="Fixed intents for the Monday brief — same reconciler, not free chat."
      freshness={`Data · ${meta.source === "live" ? "LIVE" : "FIXTURES"} · ${
        meta.periodPresetLabel
      }${meta.sourceDetail ? ` · ${meta.sourceDetail}` : ""}`}
    >
      <CannedPrompts pnl={pnl} />
      <p className="text-xs leading-relaxed text-zinc-500">
        Open GenBI chat is out of scope. Click a card to filter reconciler
        output (winners/losers, unmapped, missing rates, etc.). Period follows{" "}
        <code className="rounded bg-zinc-100 px-1">?period=</code> like the brief.
      </p>
    </AppShell>
  );
  });
}
