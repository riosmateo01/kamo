import type { ProjectPnL } from "@/lib/contracts/types";
import { formatUsd, formatPct } from "@/lib/brief";

type ProjectListProps = {
  title: string;
  empty: string;
  projects: ProjectPnL[];
  showDelta?: boolean;
};

export function ProjectList({
  title,
  empty,
  projects,
  showDelta = true,
}: ProjectListProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm">
      <header className="border-b border-zinc-100 bg-zinc-50/60 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      </header>
      {projects.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {projects.map((p) => {
            const delta = p.prior.grossProfitDelta;
            const deltaTone =
              delta > 0
                ? "text-emerald-700"
                : delta < 0
                  ? "text-rose-700"
                  : "text-zinc-500";
            return (
              <li
                key={p.harvestProjectId}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900">
                    {p.name}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500 tabular-nums">
                    Rev {formatUsd(p.revenue)} · Labor {formatUsd(p.laborCost)} ·{" "}
                    {formatPct(p.grossMargin)} margin
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div
                    className={`text-sm font-semibold tabular-nums ${
                      p.grossProfit < 0 ? "text-rose-700" : "text-zinc-900"
                    }`}
                  >
                    {formatUsd(p.grossProfit)}
                  </div>
                  {showDelta ? (
                    <div className={`text-xs tabular-nums ${deltaTone}`}>
                      {formatUsd(delta, { signed: true })} vs prior
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
