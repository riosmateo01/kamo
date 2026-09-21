"use client";

import type { ProjectPnL } from "@/lib/contracts/types";
import { formatUsd, formatPct } from "@/lib/brief";
import { PnlEvidencePanel } from "@/components/metrics/PnlEvidencePanel";
import { useEffect, useState } from "react";

type ProjectTableProps = {
  projects: ProjectPnL[];
};

export function ProjectTable({ projects }: ProjectTableProps) {
  const sorted = [...projects].sort((a, b) => b.grossProfit - a.grossProfit);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sorted.find((p) => p.harvestProjectId === selectedId);

  useEffect(() => {
    if (!selectedId) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [selectedId]);

  return (
    <section id="projects" className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm">
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
                  <tr key={p.harvestProjectId} className={idx % 2 === 1 ? "bg-zinc-50/50" : "bg-white"}>
                    <td className="px-4 py-2.5 font-medium text-zinc-900">
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.harvestProjectId)}
                        className="rounded-sm text-left font-medium text-zinc-900 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                        aria-label={`View calculation evidence for ${p.name}`}
                      >
                        {p.name}
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">View working</span>
                      </button>
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
      {selected ? (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/40 p-4 backdrop-blur-[1px] sm:p-8"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelectedId(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="evidence-title"
            className="mx-auto max-h-full max-w-5xl overflow-y-auto rounded-xl border border-zinc-300 bg-zinc-50 p-4 shadow-2xl sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 id="evidence-title" className="text-base font-semibold text-zinc-900">
                How {selected.name} was calculated
              </h3>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                Close
              </button>
            </div>
            <PnlEvidencePanel evidence={selected.evidence} />
          </section>
        </div>
      ) : null}
    </section>
  );
}
