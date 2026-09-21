"use client";

import { useState } from "react";
import Link from "next/link";
import type { ConnectionStatus } from "@/lib/sync/connections";

type NotifyEnvStatus = {
  slack: "set" | "unset";
  email: "set" | "unset";
  fromEmail: "set" | "unset";
  threshold: number;
};

type Props = {
  dbAvailable: boolean;
  harvest: ConnectionStatus;
  qbo: ConnectionStatus;
  notifyEnv?: NotifyEnvStatus;
};

function formatSyncAt(iso: string | null): string {
  if (!iso) return "Never";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function StatusPill({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
        connected
          ? "bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-200"
          : "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          connected ? "bg-emerald-600" : "bg-zinc-400"
        }`}
        aria-hidden
      />
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

function ProviderCard({
  title,
  status,
  startHref,
}: {
  title: string;
  status: ConnectionStatus;
  startHref: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <StatusPill connected={status.connected} />
      </div>
      <dl className="mt-4 space-y-2.5 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">Account</dt>
          <dd className="text-right font-medium text-zinc-900">
            {status.accountLabel ?? "—"}
          </dd>
        </div>
        {status.realmId ? (
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">
              {status.provider === "harvest" ? "Account ID" : "Realm"}
            </dt>
            <dd className="font-mono text-zinc-800">{status.realmId}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">Last sync</dt>
          <dd className="text-right text-zinc-800">
            <span className="font-medium">{formatSyncAt(status.lastSyncAt)}</span>
            {status.lastSyncStatus ? (
              <span className="mt-0.5 block text-[11px] uppercase tracking-wide text-zinc-500">
                {status.lastSyncStatus}
              </span>
            ) : null}
          </dd>
        </div>
      </dl>
      <a
        href={startHref}
        className={`mt-5 inline-flex rounded-md px-3.5 py-2 text-xs font-semibold ${
          status.connected
            ? "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
            : "bg-zinc-900 text-white hover:bg-zinc-800"
        }`}
      >
        {status.connected ? "Reconnect" : "Connect"}
      </a>
    </div>
  );
}

export function ConnectionsPanel({ dbAvailable, harvest, qbo, notifyEnv }: Props) {
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<"sync" | "seed" | null>(null);

  const bothConnected = harvest.connected && qbo.connected;
  const anySync =
    harvest.lastSyncAt || qbo.lastSyncAt
      ? formatSyncAt(
          [harvest.lastSyncAt, qbo.lastSyncAt]
            .filter(Boolean)
            .sort()
            .reverse()[0] ?? null
        )
      : null;

  async function syncNow() {
    setBusy("sync");
    setSyncMsg(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wait: true }),
      });
      const json = (await res.json()) as { status: string; message: string };
      setSyncMsg(`[${json.status}] ${json.message}`);
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(null);
    }
  }

  async function seedFixtures() {
    setBusy("seed");
    setSeedMsg(null);
    try {
      const res = await fetch("/api/sync/seed-fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stubTokens: true }),
      });
      const json = (await res.json()) as { status: string; message: string };
      setSeedMsg(`[${json.status}] ${json.message}`);
    } catch (err) {
      setSeedMsg(err instanceof Error ? err.message : "Seed failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {!dbAvailable ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-950">
          <p className="font-semibold">Postgres not configured</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/85">
            Brief stays on <strong>FIXTURES</strong>. Set{" "}
            <code className="rounded bg-amber-100/80 px-1">DATABASE_URL</code>,
            run <code className="rounded bg-amber-100/80 px-1">npm run db:migrate</code>,
            then seed or connect.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {bothConnected
                  ? "Both providers connected"
                  : harvest.connected || qbo.connected
                    ? "Partially connected"
                    : "Ready to connect"}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {anySync
                  ? `Most recent sync · ${anySync}`
                  : "No sync yet — use Sync now after connecting (or seed fixtures)."}
              </p>
            </div>
            <button
              type="button"
              disabled={busy !== null}
              onClick={syncNow}
              className="rounded-md bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
            >
              {busy === "sync" ? "Syncing…" : "Sync now"}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <ProviderCard
          title="Harvest"
          status={harvest}
          startHref="/api/auth/harvest/start"
        />
        <ProviderCard
          title="QuickBooks Online"
          status={qbo}
          startHref="/api/auth/qbo/start"
        />
      </div>

      <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Sync &amp; seed</h3>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-600">
              Sync pulls into raw tables when tokens exist. Exact-name matches
              auto-map Harvest ↔ QBO on sync. Fixture stub tokens re-seed mocks
              → DB. Real OAuth tokens call live Harvest + QBO HTTP.
            </p>
          </div>
          <Link
            href="/settings/mapping"
            className="shrink-0 text-xs font-semibold text-zinc-700 underline-offset-2 hover:underline"
          >
            View unmatched mapping →
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={syncNow}
            className="rounded-md bg-sky-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
          >
            {busy === "sync" ? "Syncing…" : "Sync now"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={seedFixtures}
            className="rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            {busy === "seed" ? "Seeding…" : "Seed fixtures → DB"}
          </button>
        </div>
        {syncMsg ? (
          <p className="mt-3 whitespace-pre-wrap rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-700 ring-1 ring-zinc-200">
            {syncMsg}
          </p>
        ) : null}
        {seedMsg ? (
          <p className="mt-3 whitespace-pre-wrap rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-700 ring-1 ring-zinc-200">
            {seedMsg}
          </p>
        ) : null}
      </div>

      {notifyEnv ? (
        <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                RFO notify (Slack / email)
              </h3>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-600">
                Status only — set{" "}
                <code className="rounded bg-zinc-100 px-1">SLACK_WEBHOOK_URL</code>{" "}
                /{" "}
                <code className="rounded bg-zinc-100 px-1">NOTIFY_EMAIL</code> in
                env. Secrets never shown here.
              </p>
            </div>
            <Link
              href="/rfo"
              className="shrink-0 text-xs font-semibold text-zinc-700 underline-offset-2 hover:underline"
            >
              Open RFO →
            </Link>
          </div>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              { k: "SLACK_WEBHOOK_URL", v: notifyEnv.slack },
              { k: "NOTIFY_EMAIL", v: notifyEnv.email },
              { k: "RFO_FROM_EMAIL", v: notifyEnv.fromEmail },
              {
                k: "MARGIN_RISK_THRESHOLD",
                v: `${(notifyEnv.threshold * 100).toFixed(0)}%`,
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
        </div>
      ) : null}
    </div>
  );
}
