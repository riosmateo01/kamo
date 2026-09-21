"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { PeriodKey } from "@/lib/brief/period";

type Props = {
  period: PeriodKey;
  start?: string;
  end?: string;
  /** Base path for the brief page */
  hrefBase?: string;
};

const PRESETS: { key: PeriodKey; label: string }[] = [
  { key: "last_week", label: "Last week" },
  { key: "mtd", label: "MTD" },
  { key: "custom", label: "Custom" },
];

function hrefFor(
  base: string,
  key: PeriodKey,
  custom?: { start?: string; end?: string }
): string {
  const q = new URLSearchParams();
  q.set("period", key);
  if (key === "custom") {
    if (custom?.start) q.set("start", custom.start);
    if (custom?.end) q.set("end", custom.end);
  }
  return `${base}?${q.toString()}`;
}

export function PeriodPicker({
  period,
  start = "",
  end = "",
  hrefBase = "/brief",
}: Props) {
  const router = useRouter();
  const [customStart, setCustomStart] = useState(start);
  const [customEnd, setCustomEnd] = useState(end);
  const showCustom = period === "custom";

  const applyCustom = useCallback(() => {
    if (!customStart || !customEnd) return;
    router.push(hrefFor(hrefBase, "custom", { start: customStart, end: customEnd }));
  }, [customStart, customEnd, hrefBase, router]);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="inline-flex flex-wrap rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5"
        role="group"
        aria-label="Brief period"
      >
        {PRESETS.map(({ key, label }) => {
          const active = period === key;
          return (
            <Link
              key={key}
              href={
                key === "custom"
                  ? hrefFor(hrefBase, "custom", {
                      start: customStart || start || undefined,
                      end: customEnd || end || undefined,
                    })
                  : hrefFor(hrefBase, key)
              }
              className={
                active
                  ? "rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
                  : "rounded-md px-2.5 py-1 text-xs font-medium text-zinc-600 hover:text-zinc-900"
              }
              aria-current={active ? "true" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </div>
      {showCustom ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-0.5 text-[11px] text-zinc-500">
            Start
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-[11px] text-zinc-500">
            End
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900"
            />
          </label>
          <button
            type="button"
            onClick={applyCustom}
            disabled={!customStart || !customEnd}
            className="rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      ) : null}
    </div>
  );
}
