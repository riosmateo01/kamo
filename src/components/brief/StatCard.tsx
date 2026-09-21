"use client";

import type { MetricResult } from "@/lib/metrics/types";
import { MetricEvidencePanel } from "@/components/metrics/PnlEvidencePanel";
import { useState } from "react";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "negative" | "muted";
  evidence?: MetricResult;
};

const toneClass: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-zinc-900",
  positive: "text-emerald-700",
  negative: "text-rose-700",
  muted: "text-zinc-500",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  evidence,
}: StatCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative rounded-xl border border-zinc-200/80 bg-white px-4 py-3.5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div
        className={`mt-1.5 text-2xl font-semibold tracking-tight tabular-nums ${toneClass[tone]}`}
      >
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-zinc-500 tabular-nums">{hint}</div>
      ) : null}
      {evidence ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 hover:text-indigo-900"
          aria-label={`View calculation evidence for ${label}`}
        >
          View working
        </button>
      ) : null}
      {open && evidence ? (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/40 p-4 backdrop-blur-[1px] sm:p-8"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`metric-${evidence.key}-title`}
            className="mx-auto max-h-full max-w-3xl overflow-y-auto rounded-xl border border-zinc-300 bg-zinc-50 p-4 shadow-2xl sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 id={`metric-${evidence.key}-title`} className="text-base font-semibold text-zinc-900">
                  How {evidence.label.toLowerCase()} was calculated
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {evidence.scope.name} · {evidence.scope.period.start} → {evidence.scope.period.end}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                Close
              </button>
            </div>
            <MetricEvidencePanel metric={evidence} showRecords />
          </section>
        </div>
      ) : null}
    </div>
  );
}
