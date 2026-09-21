"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type NotifyChannel = "slack" | "email" | "none";

type EnvStatus = {
  slack: "set" | "unset";
  email: "set" | "unset";
  fromEmail: "set" | "unset";
  threshold: number;
};

type ExceptionRow = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

type Props = {
  envStatus: EnvStatus;
};

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function RfoPanel({ envStatus }: Props) {
  const [notify, setNotify] = useState<NotifyChannel>("none");
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState<"monday_brief" | "margin_risk" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [lastView, setLastView] = useState<Record<string, unknown> | null>(
    null
  );

  const loadExceptions = useCallback(async () => {
    try {
      const res = await fetch("/api/rfo/exceptions");
      const data = await res.json();
      if (data.ok) setExceptions(data.exceptions ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadExceptions();
  }, [loadExceptions]);

  async function runPlay(play: "monday_brief" | "margin_risk") {
    setBusy(play);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/rfo/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          play,
          dryRun,
          notify: play === "margin_risk" ? notify : "none",
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Run failed");
        return;
      }
      const triggerNote =
        data.triggers?.length > 0
          ? ` · ${data.triggers.length} trigger(s): ${data.triggers
              .map((t: { message: string }) => t.message)
              .join("; ")}`
          : "";
      if (play === "monday_brief") {
        setMessage(
          `Monday Brief play OK — ${data.view?.projectCount ?? "?"} projects, ${data.view?.clientCount ?? "?"} clients${triggerNote}`
        );
        setLastView(data.view ?? null);
      } else {
        const count = data.view?.exceptionCount ?? 0;
        setMessage(
          `Margin risk scan — ${count} exception(s) at threshold ${formatPct(envStatus.threshold)}${triggerNote}`
        );
        setLastView(data.view ?? null);
        await loadExceptions();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          How Kamo works
        </h2>
        <ol className="mt-4 space-y-4">
          {[
            {
              letter: "R",
              title: "Reconnaissance",
              body: "Examine spreadsheets, databases, manual steps, and workflow problems — starting with Harvest + QuickBooks Online.",
            },
            {
              letter: "F",
              title: "Fabrication",
              body: "Build a trusted working object: the Monday P&L brief, or margin-risk / over-serviced exceptions on the same fabric.",
            },
            {
              letter: "O",
              title: "Orchestration",
              body: "Connect to tools you already use and trigger action — Sync today; Slack or email when an exception fires.",
            },
          ].map((step) => (
            <li key={step.letter} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                {step.letter}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-xs leading-relaxed text-zinc-500">
          Same thin skeleton powers the{" "}
          <Link href="/brief" className="font-medium text-zinc-800 underline underline-offset-2">
            Monday brief
          </Link>{" "}
          and this second O-path. Not open GenBI chat.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">Run plays</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Recon → fabric → optional notify. Dry-run is on by default so nothing
          leaves the box until you opt in.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
          <label className="inline-flex items-center gap-2 text-zinc-700">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Dry-run (no real Slack/email)
          </label>
          <label className="inline-flex items-center gap-2 text-zinc-700">
            Notify
            <select
              value={notify}
              onChange={(e) => setNotify(e.target.value as NotifyChannel)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-900"
            >
              <option value="none">None</option>
              <option value="slack">
                Slack {envStatus.slack === "unset" ? "(unset)" : ""}
              </option>
              <option value="email">
                Email {envStatus.email === "unset" ? "(unset)" : ""}
              </option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void runPlay("monday_brief")}
            className="inline-flex rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {busy === "monday_brief" ? "Running…" : "Run Monday Brief play"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void runPlay("margin_risk")}
            className="inline-flex rounded-md border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
          >
            {busy === "margin_risk" ? "Scanning…" : "Scan margin risk"}
          </button>
          <Link
            href="/brief"
            className="inline-flex items-center rounded-md px-3 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900"
          >
            Open brief →
          </Link>
        </div>

        {message ? (
          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900 ring-1 ring-inset ring-emerald-100">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-900 ring-1 ring-inset ring-red-100">
            {error}
          </p>
        ) : null}

        {lastView && "exceptionCount" in lastView ? (
          <p className="mt-3 text-xs text-zinc-500">
            Last scan: {String(lastView.exceptionCount)} exception(s) · period{" "}
            {String(lastView.periodLabel ?? "—")} · source{" "}
            {String(lastView.source ?? "—")}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">
            Margin-risk exceptions
          </h2>
          <button
            type="button"
            onClick={() => void loadExceptions()}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
          >
            Refresh
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Threshold {formatPct(envStatus.threshold)} (
          <code className="rounded bg-zinc-100 px-1">MARGIN_RISK_THRESHOLD</code>
          ) · over-serviced when labor cost &gt; revenue
        </p>

        {exceptions.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">
            No exceptions yet. Run &ldquo;Scan margin risk&rdquo; to fabricate
            exception objects on the shared fabric.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {exceptions.map((ex) => {
              const p = ex.payload;
              const reasons = Array.isArray(p.reasons)
                ? (p.reasons as string[]).join(", ")
                : "—";
              const evidence =
                p.evidence && typeof p.evidence === "object"
                  ? (p.evidence as {
                      answer?: string;
                      calculation?: string;
                      records?: Array<{ label: string; value: string }>;
                      gaps?: string[];
                    })
                  : null;
              return (
                <li key={ex.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-zinc-900">
                      {ex.title}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">
                      {ex.id}
                    </span>
                  </div>
                  <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
                    <div>
                      <dt className="inline text-zinc-400">Margin </dt>
                      <dd className="inline font-medium">
                        {typeof p.grossMargin === "number"
                          ? formatPct(p.grossMargin)
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-zinc-400">Rev </dt>
                      <dd className="inline">
                        {typeof p.revenue === "number"
                          ? formatUsd(p.revenue)
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-zinc-400">Labor </dt>
                      <dd className="inline">
                        {typeof p.laborCost === "number"
                          ? formatUsd(p.laborCost)
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-zinc-400">Why </dt>
                      <dd className="inline">{reasons}</dd>
                    </div>
                  </dl>
                  {evidence ? (
                    <div className="mt-3 space-y-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2.5 text-xs text-zinc-700">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        Evidence
                      </p>
                      {evidence.answer ? (
                        <div>
                          <p className="font-medium text-zinc-500">Answer</p>
                          <p className="mt-0.5 leading-relaxed text-zinc-800">
                            {evidence.answer}
                          </p>
                        </div>
                      ) : null}
                      {evidence.calculation ? (
                        <div>
                          <p className="font-medium text-zinc-500">
                            Calculation
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-zinc-800">
                            {evidence.calculation}
                          </p>
                        </div>
                      ) : null}
                      {evidence.records && evidence.records.length > 0 ? (
                        <div>
                          <p className="font-medium text-zinc-500">Records</p>
                          <ul className="mt-0.5 space-y-0.5 text-zinc-700">
                            {evidence.records.map((r) => (
                              <li key={`${r.label}:${r.value}`}>
                                <span className="text-zinc-400">{r.label}: </span>
                                <span className="font-mono text-[11px]">
                                  {r.value}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      <div>
                        <p className="font-medium text-zinc-500">
                          Gaps / needs review
                        </p>
                        {evidence.gaps && evidence.gaps.length > 0 ? (
                          <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-amber-900/80">
                            {evidence.gaps.map((g) => (
                              <li key={g}>{g}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-0.5 text-zinc-500">
                            None flagged for this entity
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {new Date(ex.createdAt).toLocaleString("en-US", {
                      timeZone: "America/New_York",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    ET
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">
          Notify configuration
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Status only — secrets stay in env / Vercel. Never paste webhooks here.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              k: "SLACK_WEBHOOK_URL",
              v: envStatus.slack,
            },
            {
              k: "NOTIFY_EMAIL",
              v: envStatus.email,
            },
            {
              k: "RFO_FROM_EMAIL",
              v: envStatus.fromEmail,
            },
            {
              k: "MARGIN_RISK_THRESHOLD",
              v: formatPct(envStatus.threshold),
            },
          ].map((row) => (
            <div
              key={row.k}
              className="flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs"
            >
              <dt className="font-mono text-zinc-600">{row.k}</dt>
              <dd
                className={`font-semibold uppercase tracking-wide ${
                  row.v === "set"
                    ? "text-emerald-700"
                    : row.v === "unset"
                      ? "text-zinc-400"
                      : "text-zinc-800"
                }`}
              >
                {row.v}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          Slack: set a Incoming Webhook URL. Email: set{" "}
          <code className="rounded bg-zinc-100 px-1">NOTIFY_EMAIL</code> plus{" "}
          <code className="rounded bg-zinc-100 px-1">RESEND_API_KEY</code> (optional{" "}
          <code className="rounded bg-zinc-100 px-1">RFO_FROM_EMAIL</code>).
          Unset channels dry-run as no-ops.
        </p>
      </section>
    </div>
  );
}
