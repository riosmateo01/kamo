import type { ProjectPnL } from "@/lib/contracts/types";
import { formatUsd, formatPct } from "@/lib/brief";

type ProjectTableProps = {
  projects: ProjectPnL[];
};

export function ProjectTable({ projects }: ProjectTableProps) {
  const sorted = [...projects].sort((a, b) => b.grossProfit - a.grossProfit);

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-100 bg-zinc-50/60 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">Projects</h2>
        <span className="text-xs text-zinc-500 tabular-nums">
          {sorted.length} mapped
        </span>
      </header>
      {sorted.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-500">
          No mapped projects in this period.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="sticky top-0 bg-zinc-50 text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Name</th>
                <th className="px-4 py-2.5 font-semibold text-right">Revenue</th>
                <th className="px-4 py-2.5 font-semibold text-right">Labor</th>
                <th className="px-4 py-2.5 font-semibold text-right">GP</th>
                <th className="px-4 py-2.5 font-semibold text-right">Margin</th>
                <th className="px-4 py-2.5 font-semibold text-right">vs prior GP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sorted.map((p, idx) => {
                const delta = p.prior.grossProfitDelta;
                const deltaTone =
                  delta > 0
                    ? "text-emerald-700"
                    : delta < 0
                      ? "text-rose-700"
                      : "text-zinc-500";
                return (
                  <tr
                    key={p.harvestProjectId}
                    className={
                      idx % 2 === 1
                        ? "bg-zinc-50/50 hover:bg-zinc-50"
                        : "hover:bg-zinc-50/80"
                    }
                  >
                    <td className="px-4 py-2.5 font-medium text-zinc-900">
                      {p.name}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">
                      {formatUsd(p.revenue)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">
                      {formatUsd(p.laborCost)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-medium tabular-nums ${
                        p.grossProfit < 0 ? "text-rose-700" : "text-zinc-900"
                      }`}
                    >
                      {formatUsd(p.grossProfit)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">
                      {formatPct(p.grossMargin)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right tabular-nums ${deltaTone}`}
                    >
                      {formatUsd(delta, { signed: true })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
