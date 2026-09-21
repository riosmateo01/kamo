import type {
  NeedsReviewItem,
  ProjectPnL,
  ReconciledPnL,
} from "@/lib/contracts/types";

/** Margin below this is "thin" when no projects are underwater. */
export const THIN_MARGIN_THRESHOLD = 0.5;

export type BriefViews = {
  winners: ProjectPnL[];
  losers: ProjectPnL[];
  /** Underwater (GP < 0) if any; otherwise thin-margin projects. */
  watchlist: ProjectPnL[];
  watchlistMode: "underwater" | "thin";
  unmapped: NeedsReviewItem[];
  missingRates: NeedsReviewItem[];
};

/**
 * Derive Monday-brief slices from reconciled P&L.
 * Winners/losers ranked by grossProfitDelta (vs prior), then by GP $.
 */
export function deriveBriefViews(
  pnl: ReconciledPnL,
  opts?: { topN?: number; thinMargin?: number }
): BriefViews {
  const topN = opts?.topN ?? 3;
  const thin = opts?.thinMargin ?? THIN_MARGIN_THRESHOLD;

  const byDeltaDesc = [...pnl.projects].sort(
    (a, b) => b.prior.grossProfitDelta - a.prior.grossProfitDelta
  );
  const winners = byDeltaDesc
    .filter((p) => p.prior.grossProfitDelta > 0)
    .slice(0, topN);
  const losers = [...byDeltaDesc]
    .reverse()
    .filter((p) => p.prior.grossProfitDelta < 0)
    .slice(0, topN);

  // If no positive/negative deltas, fall back to absolute GP ranking
  const winnersOut =
    winners.length > 0
      ? winners
      : [...pnl.projects]
          .sort((a, b) => b.grossProfit - a.grossProfit)
          .slice(0, topN);
  const losersOut =
    losers.length > 0
      ? losers
      : [...pnl.projects]
          .sort((a, b) => a.grossProfit - b.grossProfit)
          .slice(0, topN)
          .filter((p) => !winnersOut.some((w) => w.harvestProjectId === p.harvestProjectId));

  const underwater = pnl.projects.filter((p) => p.grossProfit < 0);
  const thinMargin = pnl.projects.filter(
    (p) => p.grossProfit >= 0 && p.grossMargin < thin
  );

  const watchlistMode: "underwater" | "thin" =
    underwater.length > 0 ? "underwater" : "thin";
  const watchlist =
    watchlistMode === "underwater" ? underwater : thinMargin;

  const unmapped = pnl.needsReview.filter(
    (n) => n.issue === "unmapped"
  );
  const missingRates = pnl.needsReview.filter(
    (n) => n.issue === "missing_cost_rate"
  );

  return {
    winners: winnersOut,
    losers: losersOut,
    watchlist,
    watchlistMode,
    unmapped,
    missingRates,
  };
}

export const CANNED_PROMPTS = [
  {
    id: "who-lost",
    title: "Who lost money last week?",
    description: "Projects and clients with negative gross profit in the brief period.",
  },
  {
    id: "project-pnl-mtd",
    title: "Project P&L MTD",
    description: "Month-to-date revenue, labor, and GP by mapped project.",
  },
  {
    id: "unmapped-harvest",
    title: "Unmapped Harvest projects",
    description: "Harvest projects with no QBO job — hours stuck in needs-review.",
  },
  {
    id: "labor-rev-gap",
    title: "Labor vs revenue gap by client",
    description: "Where labor cost is outrunning recognized revenue this period.",
  },
  {
    id: "missing-rates",
    title: "Missing cost rates",
    description: "Time entries excluded from labor cost because costRate is null.",
  },
] as const;
