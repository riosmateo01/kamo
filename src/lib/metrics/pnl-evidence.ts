import type {
  DateRange,
  HarvestTimeEntry,
  QboRevenueLine,
} from "@/lib/contracts/types";
import type {
  MetricResult,
  MetricScope,
  MetricSourceRecord,
  PnlEvidence,
} from "./types";

function inPeriod(date: string, period: DateRange): boolean {
  return date >= period.start && date <= period.end;
}

function metric(
  input: Omit<MetricResult, "scope"> & { scope: MetricScope }
): MetricResult {
  return input;
}

export function buildProjectPnlEvidence(input: {
  harvestProjectId: string;
  qboJobId: string;
  name: string;
  period: DateRange;
  timeEntries: HarvestTimeEntry[];
  revenueLines: QboRevenueLine[];
}): PnlEvidence {
  const scope: MetricScope = {
    kind: "project",
    id: input.harvestProjectId,
    name: input.name,
    period: input.period,
  };
  const revenueRecords: MetricSourceRecord[] = input.revenueLines
    .filter((r) => r.jobId === input.qboJobId && inPeriod(r.date, input.period))
    .map((r) => ({
      id: r.id,
      source: "qbo",
      kind: "revenue_line",
      date: r.date,
      label: r.memo || `QBO revenue line ${r.id}`,
      amount: r.amount,
      contribution: r.amount,
    }));
  const laborRecords: MetricSourceRecord[] = input.timeEntries
    .filter(
      (e) =>
        e.projectId === input.harvestProjectId && inPeriod(e.date, input.period)
    )
    .map((e) => ({
      id: e.id,
      source: "harvest",
      kind: "time_entry",
      date: e.date,
      label: `Harvest time entry ${e.id}`,
      hours: e.hours,
      rate: e.costRate,
      contribution: e.costRate == null ? null : e.hours * e.costRate,
    }));

  const revenue = revenueRecords.reduce((sum, r) => sum + (r.contribution ?? 0), 0);
  const laborCost = laborRecords.reduce((sum, r) => sum + (r.contribution ?? 0), 0);
  const missing = laborRecords.filter((r) => r.rate == null);
  const gaps = missing.length
    ? [
        `${missing.length} time ${missing.length === 1 ? "entry has" : "entries have"} no cost rate and ${missing.length === 1 ? "is" : "are"} excluded from labor cost.`,
      ]
    : [];
  const grossProfit = revenue - laborCost;
  const grossMargin = revenue === 0 ? 0 : grossProfit / revenue;

  return {
    revenue: metric({
      key: "revenue",
      label: "Revenue",
      value: revenue,
      unit: "usd",
      scope,
      calculation: `Sum of ${revenueRecords.length} QBO revenue ${revenueRecords.length === 1 ? "line" : "lines"} mapped to this project; tax excluded by the connector.`,
      records: revenueRecords,
      gaps: [],
    }),
    laborCost: metric({
      key: "labor_cost",
      label: "Labor cost",
      value: laborCost,
      unit: "usd",
      scope,
      calculation: `Sum of Harvest hours × cost rate across ${laborRecords.length} time ${laborRecords.length === 1 ? "entry" : "entries"}.`,
      records: laborRecords,
      gaps,
    }),
    grossProfit: metric({
      key: "gross_profit",
      label: "Gross profit",
      value: grossProfit,
      unit: "usd",
      scope,
      calculation: `Revenue (${revenue.toFixed(2)}) − labor cost (${laborCost.toFixed(2)}).`,
      records: [...revenueRecords, ...laborRecords],
      gaps,
    }),
    grossMargin: metric({
      key: "gross_margin",
      label: "Gross margin",
      value: grossMargin,
      unit: "percent",
      scope,
      calculation:
        revenue === 0
          ? "Revenue is zero, so margin is reported as 0%."
          : `Gross profit (${grossProfit.toFixed(2)}) ÷ revenue (${revenue.toFixed(2)}).`,
      records: [...revenueRecords, ...laborRecords],
      gaps,
    }),
  };
}

export function buildClientPnlEvidence(input: {
  id: string;
  name: string;
  period: DateRange;
  projects: PnlEvidence[];
}): PnlEvidence {
  const scope: MetricScope = {
    kind: "client",
    id: input.id,
    name: input.name,
    period: input.period,
  };
  const collect = (key: keyof PnlEvidence) =>
    input.projects.flatMap((evidence) => evidence[key].records);
  const gaps = [...new Set(input.projects.flatMap((p) => p.grossProfit.gaps))];
  const revenue = input.projects.reduce((sum, p) => sum + p.revenue.value, 0);
  const laborCost = input.projects.reduce((sum, p) => sum + p.laborCost.value, 0);
  const grossProfit = revenue - laborCost;
  const grossMargin = revenue === 0 ? 0 : grossProfit / revenue;
  const projectCount = input.projects.length;

  return {
    revenue: metric({ key: "revenue", label: "Revenue", value: revenue, unit: "usd", scope, calculation: `Sum of mapped revenue across ${projectCount} ${projectCount === 1 ? "project" : "projects"}.`, records: collect("revenue"), gaps: [] }),
    laborCost: metric({ key: "labor_cost", label: "Labor cost", value: laborCost, unit: "usd", scope, calculation: `Sum of costed Harvest time across ${projectCount} ${projectCount === 1 ? "project" : "projects"}.`, records: collect("laborCost"), gaps }),
    grossProfit: metric({ key: "gross_profit", label: "Gross profit", value: grossProfit, unit: "usd", scope, calculation: `Revenue (${revenue.toFixed(2)}) − labor cost (${laborCost.toFixed(2)}).`, records: collect("grossProfit"), gaps }),
    grossMargin: metric({ key: "gross_margin", label: "Gross margin", value: grossMargin, unit: "percent", scope, calculation: revenue === 0 ? "Revenue is zero, so margin is reported as 0%." : `Gross profit (${grossProfit.toFixed(2)}) ÷ revenue (${revenue.toFixed(2)}).`, records: collect("grossMargin"), gaps }),
  };
}
