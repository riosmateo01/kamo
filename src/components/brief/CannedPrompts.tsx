"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CANNED_PROMPTS } from "@/lib/brief/views";
import { runCannedPrompt, type PromptResult } from "@/lib/brief/prompts";
import type { ReconciledPnL } from "@/lib/contracts/types";

type CannedPromptsProps = {
  compact?: boolean;
  /** When provided, buttons run filters against reconciler output */
  pnl?: ReconciledPnL;
};

export function CannedPrompts({ compact = false, pnl }: CannedPromptsProps) {
  const list = compact ? CANNED_PROMPTS.slice(0, 4) : CANNED_PROMPTS;
  const [activeId, setActiveId] = useState<string | null>(null);

  const result: PromptResult | null = useMemo(() => {
    if (!pnl || !activeId) return null;
    return runCannedPrompt(activeId, pnl);
  }, [pnl, activeId]);

  const interactive = Boolean(pnl);

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/60 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Canned prompts</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Fixed intents over reconciler output — not open chat.
          </p>
        </div>
        {compact ? (
          <Link
            href="/prompts"
            className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            View all →
          </Link>
        ) : null}
      </header>
      <ul className="grid gap-2.5 p-3 sm:grid-cols-2">
        {list.map((p) => {
          const selected = activeId === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                disabled={!interactive}
                title={
                  interactive
                    ? "Run against current brief"
                    : "Load brief data to enable"
                }
                onClick={() =>
                  setActiveId((cur) => (cur === p.id ? null : p.id))
                }
                className={`flex w-full flex-col items-start rounded-lg border px-3.5 py-3 text-left transition ${
                  interactive
                    ? selected
                      ? "border-sky-400 bg-sky-50 shadow-sm ring-1 ring-sky-200"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                    : "cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-70"
                }`}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-zinc-900">
                    {p.title}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      interactive
                        ? selected
                          ? "bg-sky-600 text-white"
                          : "bg-zinc-100 text-zinc-600"
                        : "bg-zinc-200 text-zinc-500"
                    }`}
                  >
                    {interactive ? (selected ? "Active" : "Run") : "Load"}
                  </span>
                </span>
                <span className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                  {p.description}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {result ? (
        <div className="border-t border-zinc-100 bg-zinc-50/40 px-4 py-4">
          <h3 className="text-sm font-semibold text-zinc-900">{result.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">
            {result.summary}
          </p>
          {result.rows.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {result.rows.map((row, i) => (
                <li
                  key={`${row.label}-${i}`}
                  className="rounded-lg border border-zinc-200/80 bg-white px-3.5 py-2.5 shadow-sm"
                >
                  <div className="text-sm font-medium text-zinc-800">
                    {row.label}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-600">{row.detail}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-zinc-500">No matching rows.</p>
          )}
        </div>
      ) : interactive && !compact ? (
        <p className="border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500">
          Select a prompt to filter this period&apos;s reconciler output.
        </p>
      ) : null}
    </section>
  );
}
