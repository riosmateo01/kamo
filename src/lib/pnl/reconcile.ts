import type {
  ClientPnL,
  HarvestClient,
  HarvestProject,
  HarvestTimeEntry,
  MappingSnapshot,
  NeedsReviewItem,
  PeriodPnL,
  PnLReconciler,
  ProjectPnL,
  QboRevenueLine,
  ReconciledPnL,
  DateRange,
} from "@/lib/contracts/types";

function emptyPeriod(): PeriodPnL {
  return {
    revenue: 0,
    laborHours: 0,
    laborCost: 0,
    missingCostRateHours: 0,
    grossProfit: 0,
    grossMargin: 0,
  };
}

function finalize(p: PeriodPnL): PeriodPnL {
  const grossProfit = p.revenue - p.laborCost;
  const grossMargin = p.revenue === 0 ? 0 : grossProfit / p.revenue;
  return { ...p, grossProfit, grossMargin };
}

function addLabor(
  into: PeriodPnL,
  entries: HarvestTimeEntry[],
  projectId: string,
  range: DateRange
): void {
  for (const e of entries) {
    if (e.projectId !== projectId) continue;
    if (e.date < range.start || e.date > range.end) continue;
    if (e.costRate == null) {
      into.missingCostRateHours += e.hours;
      continue;
    }
    into.laborHours += e.hours;
    into.laborCost += e.hours * e.costRate;
  }
}

function addRevenue(
  into: PeriodPnL,
  lines: QboRevenueLine[],
  jobId: string,
  range: DateRange
): void {
  for (const r of lines) {
    if (r.jobId !== jobId) continue;
    if (r.date < range.start || r.date > range.end) continue;
    into.revenue += r.amount;
  }
}

/**
 * Spike 0 reconciler — implement/complete until tests pass.
 * Starter logic is filled so `npm test` can go green once wiring is correct;
 * trim or rewrite if you prefer a from-scratch pass.
 */
export const pnlReconciler: PnLReconciler = {
  reconcile({
    period,
    priorPeriod,
    timeEntries,
    revenueLines,
    mapping,
    projects,
    clients,
  }): ReconciledPnL {
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const clientById = new Map(clients.map((c) => [c.id, c]));
    const projectMapByHarvest = new Map(
      mapping.projects.map((m) => [m.harvestProjectId, m])
    );
    const clientMapByHarvest = new Map(
      mapping.clients.map((m) => [m.harvestClientId, m])
    );

    const projectPnLs: ProjectPnL[] = [];
    const needsReview: NeedsReviewItem[] = [];

    for (const u of mapping.unmatched) {
      if (u.entityType === "client") {
        needsReview.push({
          entityType: "client",
          harvestClientId: u.id,
          issue: "unmapped",
        });
      }
      if (u.entityType === "project") {
        let laborHoursInPeriod = 0;
        let laborCostIfMapped = 0;
        for (const e of timeEntries) {
          if (e.projectId !== u.id) continue;
          if (e.date < period.start || e.date > period.end) continue;
          laborHoursInPeriod += e.hours;
          if (e.costRate != null) laborCostIfMapped += e.hours * e.costRate;
        }
        needsReview.push({
          entityType: "project",
          harvestProjectId: u.id,
          issue: "unmapped",
          laborHoursInPeriod,
          laborCostIfMapped,
        });
      }
    }

    for (const e of timeEntries) {
      if (e.date < period.start || e.date > period.end) continue;
      if (e.costRate != null) continue;
      if (!projectMapByHarvest.has(e.projectId)) continue;
      needsReview.push({
        entityType: "time",
        timeEntryId: e.id,
        issue: "missing_cost_rate",
        hours: e.hours,
        projectId: e.projectId,
      });
    }

    for (const [harvestProjectId, map] of projectMapByHarvest) {
      const meta = projectById.get(harvestProjectId);
      const current = emptyPeriod();
      const prior = emptyPeriod();
      addLabor(current, timeEntries, harvestProjectId, period);
      addLabor(prior, timeEntries, harvestProjectId, priorPeriod);
      addRevenue(current, revenueLines, map.qboJobId, period);
      addRevenue(prior, revenueLines, map.qboJobId, priorPeriod);
      const c = finalize(current);
      const p = finalize(prior);
      projectPnLs.push({
        harvestProjectId,
        qboJobId: map.qboJobId,
        name: meta?.name ?? harvestProjectId,
        ...c,
        prior: {
          ...p,
          revenueDelta: c.revenue - p.revenue,
          grossProfitDelta: c.grossProfit - p.grossProfit,
        },
      });
    }

    const clientPnLs: ClientPnL[] = [];
    for (const [harvestClientId, map] of clientMapByHarvest) {
      const meta = clientById.get(harvestClientId);
      const childProjects = projects.filter((p) => p.clientId === harvestClientId);
      const rolled = emptyPeriod();
      const rolledPrior = emptyPeriod();
      for (const hp of childProjects) {
        const pp = projectPnLs.find((x) => x.harvestProjectId === hp.id);
        if (!pp) continue;
        rolled.revenue += pp.revenue;
        rolled.laborHours += pp.laborHours;
        rolled.laborCost += pp.laborCost;
        rolled.missingCostRateHours += pp.missingCostRateHours;
        rolledPrior.revenue += pp.prior.revenue;
        rolledPrior.laborHours += pp.prior.laborHours;
        rolledPrior.laborCost += pp.prior.laborCost;
        rolledPrior.missingCostRateHours += pp.prior.missingCostRateHours;
      }
      const c = finalize(rolled);
      const p = finalize(rolledPrior);
      clientPnLs.push({
        harvestClientId,
        qboCustomerId: map.qboCustomerId,
        name: meta?.name ?? harvestClientId,
        ...c,
        prior: {
          ...p,
          revenueDelta: c.revenue - p.revenue,
          grossProfitDelta: c.grossProfit - p.grossProfit,
        },
      });
    }

    return {
      period,
      priorPeriod,
      projects: projectPnLs,
      clients: clientPnLs,
      needsReview,
    };
  },
};
