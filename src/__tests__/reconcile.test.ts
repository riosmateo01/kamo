import { describe, expect, it } from "vitest";
import { createHarvestMock } from "@/lib/connectors/harvest/mock";
import { createQboMock } from "@/lib/connectors/qbo/mock";
import { mappingService } from "@/lib/mapping/resolve";
import { pnlReconciler } from "@/lib/pnl/reconcile";
import { collectMismatches } from "@/lib/pnl/assert";
import mappingFixture from "@/lib/fixtures/mapping.json";
import expected from "@/lib/fixtures/expected-pnl.json";
import type { ClientMap, ProjectMap } from "@/lib/contracts/types";

describe("Spike 0 recon", () => {
  it("matches expected-pnl.json within tolerance", async () => {
    const harvest = createHarvestMock();
    const qbo = createQboMock();

    const period = expected.current.period;
    const priorPeriod = {
      start: "2026-09-01",
      end: "2026-09-07",
    };

    const [clients, projects, timeEntries, customers, jobs, revenueLines] =
      await Promise.all([
        harvest.listClients(),
        harvest.listProjects(),
        harvest.listTimeEntries(period),
        qbo.listCustomers(),
        qbo.listJobs(),
        qbo.listRevenue({ start: priorPeriod.start, end: period.end }),
      ]);

    // Prior-week time is needed for deltas — pull full fixture range via prior∪current
    const allTime = await harvest.listTimeEntries({
      start: priorPeriod.start,
      end: period.end,
    });

    const snapshot = mappingService.resolve({
      harvestClients: clients,
      harvestProjects: projects,
      qboCustomers: customers,
      qboJobs: jobs,
      clientMaps: mappingFixture.clientMaps as ClientMap[],
      projectMaps: mappingFixture.projectMaps as ProjectMap[],
    });

    const actual = pnlReconciler.reconcile({
      period,
      priorPeriod,
      timeEntries: allTime,
      revenueLines,
      mapping: snapshot,
      projects,
      clients,
    });

    const pairs: Array<{
      path: string;
      expected: number;
      actual: number;
      kind?: "money" | "margin";
    }> = [];

    for (const exp of expected.current.projects) {
      const got = actual.projects.find(
        (p) => p.harvestProjectId === exp.harvestProjectId
      );
      expect(got, `missing project ${exp.harvestProjectId}`).toBeTruthy();
      pairs.push(
        { path: `${exp.name}.revenue`, expected: exp.revenue, actual: got!.revenue },
        { path: `${exp.name}.laborCost`, expected: exp.laborCost, actual: got!.laborCost },
        { path: `${exp.name}.grossProfit`, expected: exp.grossProfit, actual: got!.grossProfit },
        {
          path: `${exp.name}.grossMargin`,
          expected: exp.grossMargin,
          actual: got!.grossMargin,
          kind: "margin",
        },
        {
          path: `${exp.name}.missingCostRateHours`,
          expected: exp.missingCostRateHours,
          actual: got!.missingCostRateHours,
        },
        {
          path: `${exp.name}.prior.revenueDelta`,
          expected: exp.prior.revenueDelta,
          actual: got!.prior.revenueDelta,
        },
        {
          path: `${exp.name}.prior.grossProfitDelta`,
          expected: exp.prior.grossProfitDelta,
          actual: got!.prior.grossProfitDelta,
        }
      );
    }

    for (const exp of expected.current.clients) {
      const got = actual.clients.find(
        (c) => c.harvestClientId === exp.harvestClientId
      );
      expect(got, `missing client ${exp.harvestClientId}`).toBeTruthy();
      pairs.push(
        { path: `${exp.name}.revenue`, expected: exp.revenue, actual: got!.revenue },
        { path: `${exp.name}.laborCost`, expected: exp.laborCost, actual: got!.laborCost },
        { path: `${exp.name}.grossProfit`, expected: exp.grossProfit, actual: got!.grossProfit },
        {
          path: `${exp.name}.grossMargin`,
          expected: exp.grossMargin,
          actual: got!.grossMargin,
          kind: "margin",
        }
      );
    }

    const result = collectMismatches(pairs, expected.tolerance);
    if (!result.ok) {
      const detail = result.mismatches
        .map((m) => `${m.path}: ${m.message}`)
        .join("\n");
      expect.fail(`recon mismatches:\n${detail}`);
    }

    // Unmapped project must not appear in P&L grain
    expect(
      actual.projects.find((p) => p.harvestProjectId === "h_proj_unmapped")
    ).toBeUndefined();

    expect(
      actual.needsReview.some(
        (n) => n.entityType === "project" && n.harvestProjectId === "h_proj_unmapped"
      )
    ).toBe(true);

    expect(
      actual.needsReview.some(
        (n) => n.entityType === "time" && n.timeEntryId === "te5"
      )
    ).toBe(true);

    const website = actual.projects.find(
      (p) => p.harvestProjectId === "h_proj_website"
    );
    expect(website?.evidence.revenue.value).toBe(website?.revenue);
    expect(website?.evidence.laborCost.value).toBe(website?.laborCost);
    expect(website?.evidence.grossProfit.value).toBe(website?.grossProfit);
    expect(website?.evidence.revenue.records.length).toBeGreaterThan(0);
    expect(
      website?.evidence.laborCost.records.some(
        (record) => record.id === "te5" && record.contribution === null
      )
    ).toBe(true);
    expect(website?.evidence.laborCost.gaps[0]).toContain("no cost rate");

    const acme = actual.clients.find(
      (client) => client.harvestClientId === "h_client_acme"
    );
    expect(acme?.evidence.revenue.value).toBe(acme?.revenue);
    expect(acme?.evidence.grossMargin.value).toBe(acme?.grossMargin);

    void timeEntries; // period-filtered fetch kept for Spike 1 sync shape
  });
});
