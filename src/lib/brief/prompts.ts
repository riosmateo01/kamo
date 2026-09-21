/**
 * Canned prompt filters — fixed intents over reconciler output.
 * Not free-form GenBI chat.
 */

import type { ReconciledPnL } from "@/lib/contracts/types";
import { deriveBriefViews, CANNED_PROMPTS } from "./views";
import { formatUsd, formatPct } from "./format";

export type PromptResultRow = {
  label: string;
  detail: string;
};

export type PromptResult = {
  id: string;
  title: string;
  summary: string;
  rows: PromptResultRow[];
};

export type CannedPromptId = (typeof CANNED_PROMPTS)[number]["id"];

export function runCannedPrompt(
  id: CannedPromptId | string,
  pnl: ReconciledPnL
): PromptResult {
  const meta = CANNED_PROMPTS.find((p) => p.id === id);
  const title = meta?.title ?? id;
  const views = deriveBriefViews(pnl);

  switch (id) {
    case "who-lost": {
      const projects = pnl.projects.filter((p) => p.grossProfit < 0);
      const clients = pnl.clients.filter((c) => c.grossProfit < 0);
      const rows: PromptResultRow[] = [
        ...projects.map((p) => ({
          label: `Project · ${p.name}`,
          detail: `GP ${formatUsd(p.grossProfit)} · rev ${formatUsd(p.revenue)} · labor ${formatUsd(p.laborCost)}`,
        })),
        ...clients.map((c) => ({
          label: `Client · ${c.name}`,
          detail: `GP ${formatUsd(c.grossProfit)} · rev ${formatUsd(c.revenue)} · labor ${formatUsd(c.laborCost)}`,
        })),
      ];
      return {
        id,
        title,
        summary:
          rows.length === 0
            ? "No projects or clients with negative gross profit this period."
            : `${rows.length} entity(ies) lost money (GP < 0).`,
        rows,
      };
    }
    case "project-pnl-mtd": {
      // Fixture period stands in for MTD until live calendar MTD lands
      const rows = pnl.projects.map((p) => ({
        label: p.name,
        detail: `Rev ${formatUsd(p.revenue)} · Labor ${formatUsd(p.laborCost)} · GP ${formatUsd(p.grossProfit)} (${formatPct(p.grossMargin)})`,
      }));
      return {
        id,
        title,
        summary: `Mapped project P&L for ${pnl.period.start} → ${pnl.period.end} (${rows.length} projects).`,
        rows,
      };
    }
    case "unmapped-harvest": {
      const unmapped = views.unmapped.filter((n) => n.entityType === "project");
      const rows = unmapped.map((n) => {
        if (n.entityType === "project" && n.issue === "unmapped") {
          return {
            label: n.harvestProjectId,
            detail: `Unmapped · ${n.laborHoursInPeriod}h in period · labor if mapped ${formatUsd(n.laborCostIfMapped)}`,
          };
        }
        return { label: "unmapped", detail: n.issue };
      });
      return {
        id,
        title,
        summary:
          rows.length === 0
            ? "All Harvest projects with activity are mapped."
            : `${rows.length} Harvest project(s) need a QBO job map.`,
        rows,
      };
    }
    case "labor-rev-gap": {
      const rows = pnl.clients
        .filter((c) => c.laborCost > c.revenue)
        .map((c) => ({
          label: c.name,
          detail: `Labor ${formatUsd(c.laborCost)} > rev ${formatUsd(c.revenue)} · gap ${formatUsd(c.laborCost - c.revenue)}`,
        }));
      return {
        id,
        title,
        summary:
          rows.length === 0
            ? "No clients where labor cost exceeds recognized revenue."
            : `${rows.length} client(s) with labor ahead of revenue.`,
        rows,
      };
    }
    case "missing-rates": {
      const missing = views.missingRates;
      const rows = missing.map((n) => {
        if (n.entityType === "time" && n.issue === "missing_cost_rate") {
          return {
            label: n.timeEntryId,
            detail: `${n.hours}h on project ${n.projectId} — excluded from labor cost`,
          };
        }
        return { label: "time", detail: n.issue };
      });
      return {
        id,
        title,
        summary:
          rows.length === 0
            ? "No time entries missing cost rates."
            : `${rows.length} time entr(y/ies) missing costRate.`,
        rows,
      };
    }
    default:
      return {
        id,
        title,
        summary: "Unknown prompt id — fixed intents only.",
        rows: [],
      };
  }
}
