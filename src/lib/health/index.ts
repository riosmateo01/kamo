import { loadBrief } from "@/lib/brief";
import { loadMappingView } from "@/lib/mapping/loadUnmatched";
import { listConnectionStatuses } from "@/lib/sync";

export type HealthSeverity = "healthy" | "warning" | "critical";

export type HealthIssue = {
  id: string;
  severity: Exclude<HealthSeverity, "healthy">;
  title: string;
  detail: string;
  actionLabel: string;
  actionHref: string;
};

export type DataHealth = {
  score: number;
  severity: HealthSeverity;
  source: "fixtures" | "live";
  generatedAt: string;
  connectedCount: number;
  totalConnections: number;
  mappedClients: number;
  mappedProjects: number;
  unmatchedCount: number;
  missingRateEntries: number;
  excludedHours: number;
  issues: HealthIssue[];
};

export function calculateHealth(input: {
  source: "fixtures" | "live";
  databaseAvailable: boolean;
  harvestConnected: boolean;
  qboConnected: boolean;
  harvestSyncStatus: string | null;
  qboSyncStatus: string | null;
  mappedClients: number;
  mappedProjects: number;
  unmatchedCount: number;
  missingRateEntries: number;
  excludedHours: number;
}): DataHealth {
  const issues: HealthIssue[] = [];
  if (!input.databaseAvailable) {
    issues.push({ id: "database", severity: "critical", title: "Database unavailable", detail: "Live records and connection state cannot be loaded.", actionLabel: "Open connections", actionHref: "/settings/connections" });
  }
  if (!input.harvestConnected) {
    issues.push({ id: "harvest", severity: "critical", title: "Harvest is not connected", detail: "Labor hours and delivery cost cannot refresh.", actionLabel: "Connect Harvest", actionHref: "/settings/connections" });
  }
  if (!input.qboConnected) {
    issues.push({ id: "qbo", severity: "critical", title: "QuickBooks is not connected", detail: "Revenue and accounting records cannot refresh.", actionLabel: "Connect QuickBooks", actionHref: "/settings/connections" });
  }
  if (input.harvestSyncStatus === "error" || input.qboSyncStatus === "error") {
    issues.push({ id: "sync", severity: "critical", title: "Latest sync failed", detail: "At least one connected source returned an error during its latest sync.", actionLabel: "Review connections", actionHref: "/settings/connections" });
  }
  if (input.unmatchedCount > 0) {
    issues.push({ id: "mapping", severity: "warning", title: `${input.unmatchedCount} ${input.unmatchedCount === 1 ? "identity needs" : "identities need"} mapping`, detail: "Unmapped records are excluded from reconciled client and project results.", actionLabel: "Review mapping", actionHref: "/settings/mapping" });
  }
  if (input.missingRateEntries > 0) {
    issues.push({ id: "rates", severity: "warning", title: `${input.missingRateEntries} time ${input.missingRateEntries === 1 ? "entry is" : "entries are"} missing cost rates`, detail: `${input.excludedHours.toFixed(1)} labor hours are visible but excluded from labor cost.`, actionLabel: "Review the brief", actionHref: "/brief#needs-review" });
  }
  if (input.source === "fixtures") {
    issues.push({ id: "fixtures", severity: "warning", title: "Showing fixture data", detail: "The product is not currently reporting from a recent live sync.", actionLabel: "Sync live data", actionHref: "/settings/connections" });
  }

  const critical = issues.filter((issue) => issue.severity === "critical").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  const score = Math.max(0, 100 - critical * 25 - warnings * 8);
  return {
    score,
    severity: critical > 0 ? "critical" : warnings > 0 ? "warning" : "healthy",
    source: input.source,
    generatedAt: new Date().toISOString(),
    connectedCount: Number(input.harvestConnected) + Number(input.qboConnected),
    totalConnections: 2,
    mappedClients: input.mappedClients,
    mappedProjects: input.mappedProjects,
    unmatchedCount: input.unmatchedCount,
    missingRateEntries: input.missingRateEntries,
    excludedHours: input.excludedHours,
    issues,
  };
}

export async function loadDataHealth(organizationId: string): Promise<DataHealth> {
  const [connections, mapping, brief] = await Promise.all([
    listConnectionStatuses(organizationId),
    loadMappingView(organizationId),
    loadBrief({ organizationId }),
  ]);
  const missing = brief.pnl.needsReview.filter(
    (item) => item.entityType === "time" && item.issue === "missing_cost_rate"
  );
  return calculateHealth({
    source: brief.meta.source,
    databaseAvailable: connections.dbAvailable,
    harvestConnected: connections.harvest.connected,
    qboConnected: connections.qbo.connected,
    harvestSyncStatus: connections.harvest.lastSyncStatus,
    qboSyncStatus: connections.qbo.lastSyncStatus,
    mappedClients: mapping.mappedClientCount,
    mappedProjects: mapping.mappedProjectCount,
    unmatchedCount: mapping.unmatchedClients.length + mapping.unmatchedProjects.length,
    missingRateEntries: missing.length,
    excludedHours: missing.reduce((sum, item) => sum + (item.entityType === "time" ? item.hours : 0), 0),
  });
}
