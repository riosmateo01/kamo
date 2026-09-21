import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { withOrgPage } from "@/lib/auth/with-org";
import { loadDataHealth, type HealthSeverity } from "@/lib/health";

export const dynamic = "force-dynamic";

const severityStyle: Record<HealthSeverity, string> = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  critical: "border-rose-200 bg-rose-50 text-rose-950",
};

export default async function DataHealthPage() {
  return withOrgPage(async (ctx) => {
    const health = await loadDataHealth(ctx.orgId);
    return (
      <AppShell
        title="Data health"
        current="health"
        source={health.source}
        subtitle="Coverage, freshness, mapping, and excluded records behind your operating picture."
        freshness={`Checked ${new Date(health.generatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`}
      >
        <section className={`rounded-xl border p-5 shadow-sm ${severityStyle[health.severity]}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Health score</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums">{health.score}<span className="text-lg opacity-60">/100</span></p>
            </div>
            <p className="max-w-lg text-sm leading-relaxed">
              {health.severity === "healthy"
                ? "All required sources are connected and no excluded records are currently flagged."
                : `${health.issues.length} ${health.issues.length === 1 ? "issue affects" : "issues affect"} the completeness or freshness of reported figures.`}
            </p>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Connections", `${health.connectedCount}/${health.totalConnections}`],
            ["Mapped clients", health.mappedClients],
            ["Mapped projects", health.mappedProjects],
            ["Excluded hours", health.excludedHours.toFixed(1)],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">{value}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <header className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-900">Issues and remediation</h2>
          </header>
          {health.issues.length === 0 ? (
            <p className="px-4 py-8 text-sm text-zinc-600">No data-health issues detected.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {health.issues.map((issue) => (
                <li key={issue.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${issue.severity === "critical" ? "bg-rose-500" : "bg-amber-500"}`} aria-hidden />
                      <h3 className="text-sm font-semibold text-zinc-900">{issue.title}</h3>
                    </div>
                    <p className="mt-1 pl-[18px] text-xs leading-relaxed text-zinc-600">{issue.detail}</p>
                  </div>
                  <Link href={issue.actionHref} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
                    {issue.actionLabel}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </AppShell>
    );
  });
}
