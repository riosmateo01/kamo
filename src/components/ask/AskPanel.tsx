"use client";

import { useState } from "react";
import { formatPct, formatUsd } from "@/lib/brief";
import type { AskResult } from "@/lib/ask/query";

const EXAMPLES = [
  "Which projects had the lowest margin?",
  "Show the top 5 clients by gross profit",
  "Which projects were underwater?",
  "Show projects with the highest labor cost",
];

export function AskPanel() {
  const [question, setQuestion] = useState(EXAMPLES[0]);
  const [result, setResult] = useState<AskResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = (await response.json()) as AskResult & { ok?: boolean; error?: string };
      if (!response.ok || data.ok === false) throw new Error(data.error || "Question failed");
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Question failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <label htmlFor="ask-question" className="text-sm font-semibold text-zinc-900">Ask about reconciled profit</label>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input id="ask-question" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void ask(); }} maxLength={500} className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          <button type="button" onClick={() => void ask()} disabled={busy || question.trim().length < 3} className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Running…" : "Ask Kamo"}</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => <button key={example} type="button" onClick={() => setQuestion(example)} className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] text-zinc-600 hover:bg-zinc-200">{example}</button>)}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">Questions compile into an approved metric, scope, order, and limit. Kamo executes the plan against reconciled records; it never runs generated SQL.</p>
      </section>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
      {result ? (
        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <header className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-900">Answer</h2>
            <p className="mt-1 text-xs text-zinc-600">{result.answer}</p>
          </header>
          <ul className="divide-y divide-zinc-100">
            {result.rows.map((row) => (
              <li key={row.id} className="px-4 py-3">
                <details>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                    <span className="text-sm font-medium text-zinc-900">{row.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-zinc-900">{row.evidence.unit === "percent" ? formatPct(row.value) : formatUsd(row.value)}</span>
                  </summary>
                  <div className="mt-2 rounded-md bg-zinc-50 p-3 text-xs text-zinc-600">
                    <p>{row.evidence.calculation}</p>
                    <p className="mt-1 text-zinc-500">{row.evidence.records.length} source records · {row.evidence.gaps.length} gaps</p>
                    {row.evidence.gaps.map((gap) => <p key={gap} className="mt-1 text-amber-800">Needs review: {gap}</p>)}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
