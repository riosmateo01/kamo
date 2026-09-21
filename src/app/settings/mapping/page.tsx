import { AppShell } from "@/components/AppShell";
import { loadMappingView } from "@/lib/mapping/loadUnmatched";
import Link from "next/link";
import { withOrgPage } from "@/lib/auth/with-org";

export const dynamic = "force-dynamic";

export default async function MappingSettingsPage() {
  return withOrgPage(async (ctx) => {
  const view = await loadMappingView(ctx.orgId);
  const totalUnmatched =
    view.unmatchedClients.length + view.unmatchedProjects.length;

  return (
    <AppShell
      title="Identity mapping"
      source={view.source}
      current="mapping"
      subtitle="Harvest clients & projects without a QBO counterpart."
      freshness={
        view.sourceDetail
          ? `${view.source === "live" ? "LIVE" : "FIXTURES"} · ${view.sourceDetail}`
          : view.source === "live"
            ? "LIVE"
            : "FIXTURES"
      }
    >
      <div className="rounded-xl border border-sky-200/80 bg-sky-50/70 px-4 py-3.5 text-sm text-sky-950 shadow-sm">
        <p className="font-semibold">Exact-name Sync auto-maps</p>
        <p className="mt-1 text-xs leading-relaxed text-sky-900/85">
          On Sync, Harvest clients/projects that match a QBO customer/job name
          (case-insensitive) are mapped automatically. This page is read-only —
          rename in Harvest or QBO to align, then Sync again. Manual map UI is
          not required for MVP.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Mapped clients
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
            {view.mappedClientCount}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Mapped projects
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
            {view.mappedProjectCount}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Unmatched
          </div>
          <div
            className={`mt-1 text-2xl font-semibold tabular-nums ${
              totalUnmatched > 0 ? "text-amber-800" : "text-zinc-900"
            }`}
          >
            {totalUnmatched}
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm">
        <header className="border-b border-zinc-100 bg-zinc-50/60 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            Unmatched Harvest clients
          </h2>
        </header>
        {view.unmatchedClients.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500">
            All Harvest clients in scope are mapped.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {view.unmatchedClients.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-start justify-between gap-2 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium text-zinc-900">
                    {c.name}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-zinc-500">
                    {c.id}
                  </div>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-950">
                  {c.reason}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm">
        <header className="border-b border-zinc-100 bg-zinc-50/60 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            Unmatched Harvest projects
          </h2>
        </header>
        {view.unmatchedProjects.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500">
            All Harvest projects in scope are mapped.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {view.unmatchedProjects.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-start justify-between gap-2 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium text-zinc-900">
                    {p.name}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {p.clientName ? (
                      <>Client · {p.clientName}</>
                    ) : (
                      <>Client id · {p.clientId || "—"}</>
                    )}
                    <span className="mx-1.5 text-zinc-300">·</span>
                    <span className="font-mono text-[11px]">{p.id}</span>
                  </div>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-950">
                  {p.reason}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-zinc-500">
        <Link
          href="/settings/connections"
          className="font-medium text-zinc-700 underline-offset-2 hover:underline"
        >
          ← Back to connections
        </Link>
        <span className="text-zinc-300"> · </span>
        After renaming entities in Harvest/QBO, use Sync now to refresh maps.
      </p>
    </AppShell>
  );
  });
}
