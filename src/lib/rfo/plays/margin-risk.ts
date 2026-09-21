/**
 * Fabrication play #2 — margin-risk / over-serviced exceptions from reconciled P&L.
 * Same fabric skeleton as Monday Brief; O-path notifies via orchestrator.
 * Attaches Kamino-style evidence (answer / calculation / records / gaps).
 */

import { formatPct, formatUsd } from "@/lib/brief/format";
import type {
  ClientPnL,
  NeedsReviewItem,
  ProjectPnL,
  ReconciledPnL,
} from "@/lib/contracts/types";
import { harvestQboAdapter } from "../adapters/harvest-qbo";
import { createFabricObject } from "../fabric";
import { getMarginRiskThreshold } from "../orchestrator";
import type {
  ExceptionEvidence,
  FabricObject,
  MarginRiskExceptionPayload,
  MarginRiskView,
  MondayPnLPayload,
  ReconAdapterOptions,
  ReconResult,
} from "../types";

export const MARGIN_RISK_PLAY_ID = "margin_risk" as const;

export type MarginRiskFabrication = {
  recon: ReconResult;
  fabric: FabricObject[];
  view: MarginRiskView;
};

function reasonLabel(r: MarginRiskExceptionPayload["reasons"][number]): string {
  if (r === "over_serviced") return "over-serviced (labor > revenue)";
  return "margin below threshold";
}

function gapsForEntity(
  entityType: "project" | "client",
  entityId: string,
  row: ProjectPnL | ClientPnL,
  needsReview: NeedsReviewItem[]
): string[] {
  const gaps: string[] = [];

  if (row.missingCostRateHours > 0) {
    gaps.push(
      `Missing cost rates: ${row.missingCostRateHours.toFixed(1)}h excluded from laborCost`
    );
  }

  for (const item of needsReview) {
    if (entityType === "project") {
      if (
        item.entityType === "project" &&
        item.harvestProjectId === entityId &&
        item.issue === "unmapped"
      ) {
        gaps.push(
          `Unmatched mapping: Harvest project ${entityId} (labor if mapped ${formatUsd(item.laborCostIfMapped)})`
        );
      }
      if (
        item.entityType === "time" &&
        item.projectId === entityId &&
        item.issue === "missing_cost_rate"
      ) {
        gaps.push(
          `Missing cost rate on time entry ${item.timeEntryId} (${item.hours}h)`
        );
      }
    } else {
      if (
        item.entityType === "client" &&
        item.harvestClientId === entityId &&
        item.issue === "unmapped"
      ) {
        gaps.push(`Unmatched mapping: Harvest client ${entityId}`);
      }
    }
  }

  // Cap gap noise for Slack / UI
  const MAX = 8;
  if (gaps.length > MAX) {
    const extra = gaps.length - MAX;
    return [...gaps.slice(0, MAX), `…and ${extra} more gap(s)`];
  }
  return gaps;
}

/**
 * Build structured evidence from reconciler row + needsReview.
 * Does not invent P&L math — uses revenue, laborCost, grossProfit, grossMargin as-is.
 */
export function buildExceptionEvidence(input: {
  entityType: "project" | "client";
  entityId: string;
  qboId: string;
  name: string;
  row: ProjectPnL | ClientPnL;
  reasons: MarginRiskExceptionPayload["reasons"];
  threshold: number;
  period: { start: string; end: string };
  needsReview: NeedsReviewItem[];
}): ExceptionEvidence {
  const { entityType, entityId, qboId, name, row, reasons, threshold, period } =
    input;

  const why = reasons.map(reasonLabel).join("; ");
  const answer = `${name} (${entityType}) — ${why}. Margin ${formatPct(row.grossMargin)} vs floor ${formatPct(threshold)}.`;

  const calculation = [
    `${formatUsd(row.revenue)} revenue − ${formatUsd(row.laborCost)} laborCost = ${formatUsd(row.grossProfit)} contribution`,
    `margin ${formatPct(row.grossMargin)} (threshold ${formatPct(threshold)})`,
  ].join("; ");

  const records: ExceptionEvidence["records"] = [
    {
      label: entityType === "project" ? "Harvest project" : "Harvest client",
      value: entityId,
    },
    {
      label: entityType === "project" ? "QBO job" : "QBO customer",
      value: qboId || "—",
    },
    { label: "Period", value: `${period.start} → ${period.end}` },
    { label: "Sources", value: "Harvest + QBO" },
    { label: "Labor hours", value: String(row.laborHours) },
  ];

  const gaps = gapsForEntity(entityType, entityId, row, input.needsReview);

  return { answer, calculation, records, gaps };
}

/**
 * Pure detection — used by play + unit tests.
 * Exception when margin < threshold OR laborCost > revenue (over-serviced).
 * Attaches evidence on every exception.
 */
export function detectMarginRiskExceptions(
  pnl: ReconciledPnL,
  threshold: number = getMarginRiskThreshold()
): MarginRiskExceptionPayload[] {
  const out: MarginRiskExceptionPayload[] = [];

  const check = (
    entityType: "project" | "client",
    entityId: string,
    qboId: string,
    row: ProjectPnL | ClientPnL
  ) => {
    const reasons: MarginRiskExceptionPayload["reasons"] = [];
    if (row.laborCost > row.revenue) {
      reasons.push("over_serviced");
    }
    // Margin below threshold — also catch zero-revenue with labor (margin 0)
    if (row.grossMargin < threshold) {
      // Avoid double-counting pure empty rows with no activity
      if (row.revenue > 0 || row.laborCost > 0) {
        reasons.push("margin_below_threshold");
      }
    }
    if (reasons.length === 0) return;

    const period = { start: pnl.period.start, end: pnl.period.end };
    const uniqueReasons = [...new Set(reasons)];
    const evidence = buildExceptionEvidence({
      entityType,
      entityId,
      qboId,
      name: row.name,
      row,
      reasons: uniqueReasons,
      threshold,
      period,
      needsReview: pnl.needsReview,
    });

    out.push({
      entityType,
      entityId,
      name: row.name,
      revenue: row.revenue,
      laborCost: row.laborCost,
      grossProfit: row.grossProfit,
      grossMargin: row.grossMargin,
      reasons: uniqueReasons,
      threshold,
      period,
      qboId,
      evidence,
    });
  };

  for (const p of pnl.projects) {
    check("project", p.harvestProjectId, p.qboJobId, p);
  }
  for (const c of pnl.clients) {
    check("client", c.harvestClientId, c.qboCustomerId, c);
  }

  return out;
}

export async function fabricateMarginRisk(
  opts?: ReconAdapterOptions & { threshold?: number }
): Promise<MarginRiskFabrication> {
  const threshold = opts?.threshold ?? getMarginRiskThreshold();
  const recon = await harvestQboAdapter.recon(opts);
  const pnlObj = recon.objects.find((o) => o.kind === "monday_pnl");
  if (!pnlObj) {
    throw new Error("harvest_qbo recon did not emit monday_pnl");
  }

  const payload = pnlObj.payload as unknown as MondayPnLPayload;
  const exceptions = detectMarginRiskExceptions(payload.pnl, threshold);

  const fabric: FabricObject[] = [pnlObj];
  for (const ex of exceptions) {
    const obj = await createFabricObject({
      kind: "margin_risk_exception",
      title: `Margin risk · ${ex.name} (${ex.entityType})`,
      sourceAdapterId: pnlObj.sourceAdapterId,
      playId: MARGIN_RISK_PLAY_ID,
      payload: ex as unknown as Record<string, unknown>,
    });
    fabric.push(obj);
  }

  const view: MarginRiskView = {
    threshold,
    exceptionCount: exceptions.length,
    exceptions,
    source: payload.meta.source,
    periodLabel: payload.meta.periodLabel,
    generatedAt: new Date().toISOString(),
  };

  return { recon, fabric, view };
}
