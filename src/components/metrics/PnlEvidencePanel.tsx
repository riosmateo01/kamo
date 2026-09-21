import type { MetricResult, PnlEvidence } from "@/lib/metrics/types";
import { formatPct, formatUsd } from "@/lib/brief";

function displayValue(metric: MetricResult): string {
  return metric.unit === "percent"
    ? formatPct(metric.value)
    : formatUsd(metric.value);
}

export function MetricEvidencePanel({
  metric,
  showRecords = false,
}: {
  metric: MetricResult;
  showRecords?: boolean;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="flex items-baseline justify-between gap-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {metric.label}
        </h4>
        <strong className="text-sm tabular-nums text-zinc-900">
          {displayValue(metric)}
        </strong>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-600">
        {metric.calculation}
      </p>
      {metric.gaps.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-amber-800">
          {metric.gaps.map((gap) => (
            <li key={gap}>Needs review: {gap}</li>
          ))}
        </ul>
      ) : null}
      {showRecords ? (
        metric.records.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="pb-1.5 font-semibold">Source record</th>
                  <th className="pb-1.5 font-semibold">Date</th>
                  <th className="pb-1.5 text-right font-semibold">Input</th>
                  <th className="pb-1.5 text-right font-semibold">Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {metric.records.map((record) => (
                  <tr key={`${record.source}:${record.id}`}>
                    <td className="py-1.5 pr-3 text-zinc-700">
                      <span className="mr-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-500">
                        {record.source}
                      </span>
                      {record.label}
                    </td>
                    <td className="py-1.5 text-zinc-500">{record.date}</td>
                    <td className="py-1.5 text-right tabular-nums text-zinc-600">
                      {record.hours != null
                        ? `${record.hours}h × ${record.rate == null ? "missing" : formatUsd(record.rate)}`
                        : formatUsd(record.amount ?? 0)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-zinc-900">
                      {record.contribution == null
                        ? "Excluded"
                        : formatUsd(record.contribution)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-xs text-zinc-400">No source records in scope.</p>
        )
      ) : null}
    </section>
  );
}

export function PnlEvidencePanel({ evidence }: { evidence: PnlEvidence }) {
  const scope = evidence.grossProfit.scope;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <span>
          Scope: <strong className="font-medium text-zinc-700">{scope.name}</strong>
        </span>
        <span className="tabular-nums">
          {scope.period.start} → {scope.period.end}
        </span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <MetricEvidencePanel metric={evidence.revenue} showRecords />
        <MetricEvidencePanel metric={evidence.laborCost} showRecords />
        <MetricEvidencePanel metric={evidence.grossProfit} />
        <MetricEvidencePanel metric={evidence.grossMargin} />
      </div>
    </div>
  );
}
