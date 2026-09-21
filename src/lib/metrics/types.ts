import type { DateRange } from "@/lib/contracts/types";

export type MetricUnit = "usd" | "percent" | "hours" | "count";

export type MetricSourceRecord = {
  id: string;
  source: "qbo" | "harvest";
  kind: "revenue_line" | "time_entry";
  date: string;
  label: string;
  amount?: number;
  hours?: number;
  rate?: number | null;
  contribution: number | null;
};

export type MetricScope = {
  kind: "project" | "client" | "company";
  id: string;
  name: string;
  period: DateRange;
};

/** Canonical answer shape shared by dashboards, reports, exports, and Ask. */
export type MetricResult = {
  key: "revenue" | "labor_cost" | "gross_profit" | "gross_margin";
  label: string;
  value: number;
  unit: MetricUnit;
  scope: MetricScope;
  calculation: string;
  records: MetricSourceRecord[];
  gaps: string[];
};

export type PnlEvidence = {
  revenue: MetricResult;
  laborCost: MetricResult;
  grossProfit: MetricResult;
  grossMargin: MetricResult;
};
