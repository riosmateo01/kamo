import type { ReconciledPnL } from "@/lib/contracts/types";
import type { MetricResult, PnlEvidence } from "@/lib/metrics/types";

export type AskMeasure = "revenue" | "labor_cost" | "gross_profit" | "gross_margin";
export type AskDimension = "project" | "client";

export type AskQuery = {
  measure: AskMeasure;
  dimension: AskDimension;
  order: "asc" | "desc";
  limit: number;
  negativeOnly: boolean;
};

export type AskResultRow = {
  id: string;
  label: string;
  value: number;
  evidence: MetricResult;
};

export type AskResult = {
  query: AskQuery;
  answer: string;
  rows: AskResultRow[];
};

const EVIDENCE_KEY: Record<AskMeasure, keyof PnlEvidence> = {
  revenue: "revenue",
  labor_cost: "laborCost",
  gross_profit: "grossProfit",
  gross_margin: "grossMargin",
};

export function planQuestion(question: string): AskQuery {
  const q = question.trim().toLowerCase();
  if (q.length < 3 || q.length > 500) {
    throw new Error("Question must be between 3 and 500 characters");
  }

  let measure: AskMeasure = "gross_profit";
  if (/margin|gp\s*%|profit percentage/.test(q)) measure = "gross_margin";
  else if (/labor|labour|cost|hours cost/.test(q)) measure = "labor_cost";
  else if (/revenue|sales|income/.test(q)) measure = "revenue";
  else if (/profit|contribution|gp\b/.test(q)) measure = "gross_profit";

  const dimension: AskDimension = /client|customer|account/.test(q)
    ? "client"
    : "project";
  const order = /lowest|worst|bottom|smallest|thinnest|least/.test(q)
    ? "asc"
    : "desc";
  const requestedLimit = q.match(/(?:top|bottom|first|show)\s+(\d{1,2})/)?.[1];
  const limit = Math.min(25, Math.max(1, requestedLimit ? Number(requestedLimit) : 10));
  const negativeOnly = /negative|underwater|losing|loss-making|unprofitable/.test(q);

  return { measure, dimension, order, limit, negativeOnly };
}

export function executeAskQuery(query: AskQuery, pnl: ReconciledPnL): AskResult {
  const source = query.dimension === "project" ? pnl.projects : pnl.clients;
  const evidenceKey = EVIDENCE_KEY[query.measure];
  let rows: AskResultRow[] = source.map((row) => ({
    id:
      query.dimension === "project"
        ? "harvestProjectId" in row
          ? row.harvestProjectId
          : ""
        : "harvestClientId" in row
          ? row.harvestClientId
          : "",
    label: row.name,
    value: row.evidence[evidenceKey].value,
    evidence: row.evidence[evidenceKey],
  }));
  if (query.negativeOnly) rows = rows.filter((row) => row.value < 0);
  rows.sort((a, b) =>
    query.order === "asc" ? a.value - b.value : b.value - a.value
  );
  rows = rows.slice(0, query.limit);

  const measureLabel = rows[0]?.evidence.label.toLowerCase() ?? query.measure.replace("_", " ");
  const direction = query.order === "asc" ? "lowest" : "highest";
  const filter = query.negativeOnly ? " negative" : "";
  return {
    query,
    answer:
      rows.length === 0
        ? `No${filter} ${query.dimension} results matched this question for the selected period.`
        : `Showing ${rows.length} ${query.dimension}${rows.length === 1 ? "" : "s"} with the ${direction}${filter} ${measureLabel}.`,
    rows,
  };
}
