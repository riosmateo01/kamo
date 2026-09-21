import {
  loadBrief,
  deriveBriefViews,
  formatUsd,
  formatPct,
  formatDateRange,
  formatGeneratedAt,
  parsePeriodKey,
} from "@/lib/brief";
import { StatCard } from "@/components/brief/StatCard";
import { ProjectList } from "@/components/brief/ProjectList";
import { NeedsReview } from "@/components/brief/NeedsReview";
import { ProjectTable } from "@/components/brief/ProjectTable";
import { CannedPrompts } from "@/components/brief/CannedPrompts";
import { PeriodPicker } from "@/components/brief/PeriodPicker";
import { AppShell } from "@/components/AppShell";
import { UpgradeBanner } from "@/components/billing/UpgradeBanner";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { hasActiveSubscription } from "@/lib/billing/subscription";
import { withOrgPage } from "@/lib/auth/with-org";
import Link from "next/link";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(
  v: string | string[] | undefined
): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function MondayProfitBriefPage({
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
  const views = deriveBriefViews(pnl);

  const primaryClient =
    pnl.clients.find((c) => c.harvestClientId === "h_client_acme") ??
    pnl.clients[0];

  const periodDisplay = formatDateRange(pnl.period.start, pnl.period.end);
  const priorDisplay = formatDateRange(
    pnl.priorPeriod.start,
    pnl.priorPeriod.end
  );

  const reviewCount = views.unmapped.length + views.missingRates.length;
  const isEmpty = pnl.clients.length === 0 && pnl.projects.length === 0;

  const watchTitle =
    views.watchlistMode === "underwater"
      ? "Projects underwater"
      : "Thin margin (< 50%)";
  const watchEmpty =
    views.watchlistMode === "underwater"
      ? `No underwater projects for ${meta.periodPresetLabel.toLowerCase()}.`
      : `No thin-margin projects for ${meta.periodPresetLabel.toLowerCase()}.`;

  const stripeReady = isStripeConfigured();
  const subscribed = await hasActiveSubscription(ctx.orgId);

  return (
    <AppShell
      title="Monday profit brief"
      source={meta.source}
      current="brief"
      subtitle={
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span>
              <span className="text-zinc-500">Period</span>{" "}
              <span className="font-semibold text-zinc-900">{periodDisplay}</span>
              <span className="ml-1.5 text-xs font-medium text-zinc-400">
                ({meta.periodPresetLabel})
              </span>
            </span>
            <span className="hidden text-zinc-300 sm:inline" aria-hidden>
              |
            </span>
            <span className="text-zinc-500">
              vs prior{" "}
              <span className="font-medium text-zinc-700">{priorDisplay}</span>
            </span>
          </div>
          <PeriodPicker
            period={meta.periodKey}
            start={start ?? pnl.period.start}
            end={end ?? pnl.period.end}
            hrefBase="/brief"
          />
        </div>
      }
      freshness={
        <>
          {meta.source === "live" ? "Live sync" : "Fixture data"}
          {meta.sourceDetail ? ` · ${meta.sourceDetail}` : ""} · generated{" "}
          {formatGeneratedAt(meta.generatedAt)}
        </>
      }
    >
      <UpgradeBanner
        stripeConfigured={stripeReady}
        hasSubscription={subscribed}
      />
      {isEmpty ? (
        <section className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">
            No reconciled P&amp;L for {meta.periodPresetLabel.toLowerCase()}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
            Nothing mapped in{" "}
            <span className="font-medium text-zinc-800">{periodDisplay}</span>.
            Connect Harvest and QuickBooks, then sync (pulls ~60 days). Exact-name
            matches auto-map on sync; unmatched items appear under Needs review.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              href="/settings/connections"
              className="inline-flex rounded-md bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Open connections
            </Link>
            <Link
              href="/settings/mapping"
              className="inline-flex rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              View mapping
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">
                  Summary
                  {primaryClient ? (
                    <span className="font-normal text-zinc-500">
                      {" "}
                      · {primaryClient.name}
                    </span>
                  ) : null}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Mapped clients only · {meta.source === "live" ? "LIVE" : "FIXTURES"} ·{" "}
                  {meta.periodPresetLabel}
                </p>
              </div>
              {reviewCount > 0 ? (
                <a
                  href="#needs-review"
                  className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-950 ring-1 ring-inset ring-amber-200 hover:bg-amber-200/70"
                >
                  {reviewCount} need{reviewCount === 1 ? "s" : ""} review
                </a>
              ) : null}
            </div>
            {primaryClient ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Revenue" value={formatUsd(primaryClient.revenue)} />
                <StatCard
                  label="Labor cost"
                  value={formatUsd(primaryClient.laborCost)}
                />
                <StatCard
                  label="Gross profit"
                  value={formatUsd(primaryClient.grossProfit)}
                  hint={
                    formatUsd(primaryClient.prior.grossProfitDelta, {
                      signed: true,
                    }) + " vs prior"
                  }
                  tone={
                    primaryClient.grossProfit >= 0 ? "positive" : "negative"
                  }
                />
                <StatCard
                  label="GP %"
                  value={formatPct(primaryClient.grossMargin)}
                  hint={`Prior ${formatPct(primaryClient.prior.grossMargin)}`}
                />
              </div>
            ) : (
              <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 shadow-sm">
                No mapped clients for {meta.periodPresetLabel.toLowerCase()} (
                {periodDisplay}).
              </p>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <ProjectList
              title="Top winners (GP Δ)"
              empty={`No winners for ${meta.periodPresetLabel.toLowerCase()}.`}
              projects={views.winners}
            />
            <ProjectList
              title="Top losers (GP Δ)"
              empty={`No losers for ${meta.periodPresetLabel.toLowerCase()}.`}
              projects={views.losers}
            />
            <ProjectList
              title={watchTitle}
              empty={watchEmpty}
              projects={views.watchlist}
              showDelta={false}
            />
          </div>

          <NeedsReview
            unmapped={views.unmapped}
            missingRates={views.missingRates}
          />

          <ProjectTable projects={pnl.projects} />

          <CannedPrompts compact pnl={pnl} />
        </>
      )}
    </AppShell>
  );
  });
}
