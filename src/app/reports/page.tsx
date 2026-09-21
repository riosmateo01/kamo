import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { withOrgPage } from "@/lib/auth/with-org";
import {
  DOMAIN_LABELS,
  reportAvailability,
  type DataDomain,
} from "@/lib/reports/catalog";
import { listConnectionStatuses } from "@/lib/sync";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  return withOrgPage(async (ctx) => {
    const connections = await listConnectionStatuses(ctx.orgId);
    const domains = new Set<DataDomain>();
    if (connections.qbo.connected) domains.add("accounting");
    if (connections.harvest.connected) domains.add("time_tracking");
    const reports = reportAvailability(domains);
    const readyCount = reports.filter((report) => report.ready).length;

    return (
      <AppShell
        title="Reports"
        current="reports"
        subtitle="Governed report definitions with explicit data prerequisites."
        freshness={`${readyCount} of ${reports.length} reports answerable from connected domains`}
      >
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Coverage</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-zinc-900">{readyCount}<span className="text-lg text-zinc-400">/{reports.length}</span></p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["accounting", "time_tracking", "payroll", "resourcing", "crm", "accounts_payable"] as DataDomain[]).map((domain) => (
                <span key={domain} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${domains.has(domain) ? "bg-emerald-100 text-emerald-900" : "bg-zinc-100 text-zinc-500"}`}>
                  {DOMAIN_LABELS[domain]} · {domains.has(domain) ? "connected" : "needed"}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <article key={report.id} className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{report.category}</p>
                  <h2 className="mt-1 text-base font-semibold text-zinc-900">{report.name}</h2>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${report.ready ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>
                  {report.ready ? "Ready" : "Waiting"}
                </span>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-600">{report.description}</p>
              <div className="mt-4 border-t border-zinc-100 pt-3">
                {report.ready ? (
                  <Link href={report.href} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900">Open report →</Link>
                ) : report.missingDomains.length > 0 ? (
                  <p className="text-xs text-amber-800">
                    Needs {report.missingDomains.map((domain) => DOMAIN_LABELS[domain]).join(" + ")}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500">Execution surface is in build</p>
                )}
              </div>
            </article>
          ))}
        </section>
      </AppShell>
    );
  });
}
