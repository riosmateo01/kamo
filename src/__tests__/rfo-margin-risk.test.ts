import { describe, expect, it, beforeEach } from "vitest";
import {
  detectMarginRiskExceptions,
  clearFabricMemory,
  orchestrator,
  createFabricObject,
  formatObjectMessage,
} from "@/lib/rfo";
import type { ReconciledPnL } from "@/lib/contracts/types";
import type { PnlEvidence } from "@/lib/metrics/types";

const unusedEvidence = {} as PnlEvidence;

function fixturePnL(overrides?: {
  projects?: Partial<ReconciledPnL["projects"][number]>[];
}): ReconciledPnL {
  const baseProjects: ReconciledPnL["projects"] = [
    {
      harvestProjectId: "p_ok",
      qboJobId: "j_ok",
      name: "Healthy Retainer",
      evidence: unusedEvidence,
      revenue: 10000,
      laborHours: 40,
      laborCost: 3000,
      missingCostRateHours: 0,
      grossProfit: 7000,
      grossMargin: 0.7,
      prior: {
        revenue: 9000,
        laborHours: 40,
        laborCost: 3000,
        missingCostRateHours: 0,
        grossProfit: 6000,
        grossMargin: 0.666,
        revenueDelta: 1000,
        grossProfitDelta: 1000,
      },
    },
    {
      harvestProjectId: "p_thin",
      qboJobId: "j_thin",
      name: "Thin Margin Build",
      evidence: unusedEvidence,
      revenue: 5000,
      laborHours: 80,
      laborCost: 4500,
      missingCostRateHours: 0,
      grossProfit: 500,
      grossMargin: 0.1, // 10% < 20%
      prior: {
        revenue: 5000,
        laborHours: 70,
        laborCost: 4000,
        missingCostRateHours: 0,
        grossProfit: 1000,
        grossMargin: 0.2,
        revenueDelta: 0,
        grossProfitDelta: -500,
      },
    },
    {
      harvestProjectId: "p_over",
      qboJobId: "j_over",
      name: "Over-serviced Rescue",
      evidence: unusedEvidence,
      revenue: 2000,
      laborHours: 60,
      laborCost: 4800,
      missingCostRateHours: 0,
      grossProfit: -2800,
      grossMargin: -1.4,
      prior: {
        revenue: 2000,
        laborHours: 40,
        laborCost: 3000,
        missingCostRateHours: 0,
        grossProfit: -1000,
        grossMargin: -0.5,
        revenueDelta: 0,
        grossProfitDelta: -1800,
      },
    },
  ];

  if (overrides?.projects) {
    for (const o of overrides.projects) {
      const idx = baseProjects.findIndex(
        (p) => p.harvestProjectId === o.harvestProjectId
      );
      if (idx >= 0) baseProjects[idx] = { ...baseProjects[idx], ...o };
    }
  }

  return {
    period: { start: "2026-09-08", end: "2026-09-14" },
    priorPeriod: { start: "2026-09-01", end: "2026-09-07" },
    projects: baseProjects,
    clients: [
      {
        harvestClientId: "c_bundle",
        qboCustomerId: "qc",
        name: "Bundle Client",
        evidence: unusedEvidence,
        revenue: 17000,
        laborHours: 180,
        laborCost: 12300,
        missingCostRateHours: 0,
        grossProfit: 4700,
        grossMargin: 4700 / 17000,
        prior: {
          revenue: 16000,
          laborHours: 150,
          laborCost: 10000,
          missingCostRateHours: 0,
          grossProfit: 6000,
          grossMargin: 0.375,
          revenueDelta: 1000,
          grossProfitDelta: -1300,
        },
      },
    ],
    needsReview: [
      {
        entityType: "time",
        timeEntryId: "te_missing",
        issue: "missing_cost_rate",
        hours: 2.5,
        projectId: "p_thin",
      },
    ],
  };
}

describe("margin-risk play detection", () => {
  it("flags margin below threshold and over-serviced projects", () => {
    const pnl = fixturePnL();
    const ex = detectMarginRiskExceptions(pnl, 0.2);

    const byId = Object.fromEntries(ex.map((e) => [e.entityId, e]));
    expect(byId.p_ok).toBeUndefined();

    expect(byId.p_thin).toBeDefined();
    expect(byId.p_thin.reasons).toContain("margin_below_threshold");
    expect(byId.p_thin.reasons).not.toContain("over_serviced");

    expect(byId.p_over).toBeDefined();
    expect(byId.p_over.reasons).toContain("over_serviced");
    expect(byId.p_over.reasons).toContain("margin_below_threshold");
  });

  it("respects custom threshold", () => {
    const pnl = fixturePnL();
    // 0.05 → thin at 10% passes; over still fires
    const ex = detectMarginRiskExceptions(pnl, 0.05);
    const ids = ex.map((e) => e.entityId);
    expect(ids).not.toContain("p_thin");
    expect(ids).toContain("p_over");
  });

  it("skips empty zero-activity rows", () => {
    const pnl = fixturePnL({
      projects: [
        {
          harvestProjectId: "p_empty",
          qboJobId: "j_empty",
          name: "Idle",
          revenue: 0,
          laborCost: 0,
          laborHours: 0,
          missingCostRateHours: 0,
          grossProfit: 0,
          grossMargin: 0,
        } as ReconciledPnL["projects"][number],
      ],
    });
    // inject empty project
    pnl.projects.push({
      harvestProjectId: "p_empty",
      qboJobId: "j_empty",
      name: "Idle",
      evidence: unusedEvidence,
      revenue: 0,
      laborHours: 0,
      laborCost: 0,
      missingCostRateHours: 0,
      grossProfit: 0,
      grossMargin: 0,
      prior: {
        revenue: 0,
        laborHours: 0,
        laborCost: 0,
        missingCostRateHours: 0,
        grossProfit: 0,
        grossMargin: 0,
        revenueDelta: 0,
        grossProfitDelta: 0,
      },
    });
    const ex = detectMarginRiskExceptions(pnl, 0.2);
    expect(ex.find((e) => e.entityId === "p_empty")).toBeUndefined();
  });
});

describe("margin-risk evidence", () => {
  it("attaches evidence with calculation + records on each exception", () => {
    const pnl = fixturePnL();
    const ex = detectMarginRiskExceptions(pnl, 0.2);
    const thin = ex.find((e) => e.entityId === "p_thin");
    expect(thin).toBeDefined();
    expect(thin!.evidence).toBeDefined();
    expect(thin!.evidence.answer).toMatch(/Thin Margin Build/);
    expect(thin!.evidence.answer).toMatch(/margin below threshold/i);
    expect(thin!.evidence.calculation).toMatch(/revenue/i);
    expect(thin!.evidence.calculation).toMatch(/laborCost/i);
    expect(thin!.evidence.calculation).toMatch(/contribution/i);
    expect(thin!.evidence.calculation).toMatch(/10\.0%/);
    expect(thin!.evidence.records.length).toBeGreaterThanOrEqual(3);
    const labels = thin!.evidence.records.map((r) => r.label);
    expect(labels).toContain("Harvest project");
    expect(labels).toContain("QBO job");
    expect(labels).toContain("Period");
    expect(labels).toContain("Sources");
    const sources = thin!.evidence.records.find((r) => r.label === "Sources");
    expect(sources?.value).toMatch(/Harvest \+ QBO/);
    expect(thin!.evidence.records.find((r) => r.label === "Harvest project")?.value).toBe(
      "p_thin"
    );
    // Gap from needsReview time entry on this project
    expect(thin!.evidence.gaps.some((g) => /missing cost rate/i.test(g))).toBe(
      true
    );
  });

  it("includes over-serviced answer and calculation for labor > revenue", () => {
    const pnl = fixturePnL();
    const over = detectMarginRiskExceptions(pnl, 0.2).find(
      (e) => e.entityId === "p_over"
    );
    expect(over).toBeDefined();
    expect(over!.evidence.answer).toMatch(/over-serviced/i);
    expect(over!.evidence.calculation).toMatch(/\$2,000/);
    expect(over!.evidence.calculation).toMatch(/\$4,800/);
  });

  it("formats Slack message with readable evidence sections", async () => {
    const pnl = fixturePnL();
    const thin = detectMarginRiskExceptions(pnl, 0.2).find(
      (e) => e.entityId === "p_thin"
    )!;
    const obj = await createFabricObject({
      kind: "margin_risk_exception",
      title: `Margin risk · ${thin.name} (project)`,
      payload: thin as unknown as Record<string, unknown>,
    });
    const { text, subject } = formatObjectMessage(obj);
    expect(subject).toMatch(/\[Kamo\]/);
    expect(text).toMatch(/Answer/);
    expect(text).toMatch(/Calculation/);
    expect(text).toMatch(/Records/);
    expect(text).toMatch(/Gaps \/ needs review/);
    expect(text).toMatch(/Harvest project/);
    expect(text).not.toMatch(/"answer":/); // not a JSON wall
    expect(text.length).toBeLessThan(2800);
  });
});

describe("orchestrator dry-run", () => {
  beforeEach(() => {
    clearFabricMemory();
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.NOTIFY_EMAIL;
  });

  it("dry-run returns ok without sending", async () => {
    const obj = await createFabricObject({
      kind: "margin_risk_exception",
      title: "Test exception",
      payload: {
        name: "Thin Margin Build",
        reasons: ["margin_below_threshold"],
        grossMargin: 0.1,
        revenue: 5000,
        laborCost: 4500,
        threshold: 0.2,
      },
    });

    const result = await orchestrator.trigger(obj, {
      channel: "slack",
      dryRun: true,
    });

    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.channel).toBe("dry_run");
    expect(result.fabricObjectId).toBe(obj.id);
  });

  it("unset Slack webhook becomes dry-run no-op", async () => {
    const obj = await createFabricObject({
      kind: "margin_risk_exception",
      title: "Test exception",
      payload: { name: "X", reasons: ["over_serviced"] },
    });

    const result = await orchestrator.trigger(obj, {
      channel: "slack",
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.message).toMatch(/SLACK_WEBHOOK_URL unset/i);
  });

  it("notify none is a no-op", async () => {
    const obj = await createFabricObject({
      kind: "monday_pnl",
      title: "Brief",
      payload: {},
    });
    const result = await orchestrator.trigger(obj, {
      channel: "none",
      dryRun: false,
    });
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
  });
});
