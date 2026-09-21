import type { NeedsReviewItem } from "@/lib/contracts/types";
import { formatUsd } from "@/lib/brief";
import Link from "next/link";

type NeedsReviewProps = {
  unmapped: NeedsReviewItem[];
  missingRates: NeedsReviewItem[];
};

function labelFor(item: NeedsReviewItem): string {
  if (item.entityType === "client") {
    return `Unmapped client · ${item.harvestClientId}`;
  }
  if (item.entityType === "project") {
    return `Unmapped project · ${item.harvestProjectId}`;
  }
  return `Missing cost rate · ${item.timeEntryId}`;
}

function detailFor(item: NeedsReviewItem): string | null {
  if (item.entityType === "project") {
    return `${item.laborHoursInPeriod}h in period · ${formatUsd(item.laborCostIfMapped)} if mapped`;
  }
  if (item.entityType === "time") {
    return `${item.hours}h on ${item.projectId} excluded from labor cost`;
  }
  return "No QBO customer mapped";
}

export function NeedsReview({ unmapped, missingRates }: NeedsReviewProps) {
  const items = [...unmapped, ...missingRates];
  const hasItems = items.length > 0;

  return (
    <section
      id="needs-review"
      className={`scroll-mt-4 overflow-hidden rounded-xl shadow-sm ring-1 ${
        hasItems
          ? "bg-amber-50 ring-amber-300"
          : "bg-white ring-zinc-200/80"
      }`}
    >
      <header
        className={`flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3.5 ${
          hasItems ? "border-amber-200/80 bg-amber-100/50" : "border-zinc-100"
        }`}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className={`text-sm font-semibold ${
                hasItems ? "text-amber-950" : "text-zinc-900"
              }`}
            >
              Needs review
            </h2>
            {hasItems ? (
              <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                {items.length}
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                Clear
              </span>
            )}
          </div>
          <p
            className={`mt-0.5 text-xs ${
              hasItems ? "text-amber-900/80" : "text-zinc-500"
            }`}
          >
            Unmapped entities and missing cost rates — excluded from reconciled
            P&amp;L grain.
          </p>
        </div>
        {unmapped.length > 0 ? (
          <Link
            href="/settings/mapping"
            className="shrink-0 text-xs font-semibold text-amber-950 underline-offset-2 hover:underline"
          >
            Open mapping →
          </Link>
        ) : null}
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-zinc-500">
          Nothing queued — all Harvest clients/projects in scope are mapped.
        </p>
      ) : (
        <ul className="divide-y divide-amber-200/60">
          {items.map((item, i) => (
            <li key={i} className="px-4 py-3">
              <div className="text-sm font-medium text-amber-950">
                {labelFor(item)}
              </div>
              {detailFor(item) ? (
                <div className="mt-0.5 text-xs text-amber-900/75 tabular-nums">
                  {detailFor(item)}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
