import { describe, expect, it } from "vitest";
import { calculateHealth } from "@/lib/health";

const healthyInput = {
  source: "live" as const,
  databaseAvailable: true,
  harvestConnected: true,
  qboConnected: true,
  harvestSyncStatus: "ok",
  qboSyncStatus: "ok",
  mappedClients: 4,
  mappedProjects: 12,
  unmatchedCount: 0,
  missingRateEntries: 0,
  excludedHours: 0,
};

describe("data health", () => {
  it("returns 100 when live inputs have no known gaps", () => {
    const result = calculateHealth(healthyInput);
    expect(result.score).toBe(100);
    expect(result.severity).toBe("healthy");
    expect(result.issues).toHaveLength(0);
  });

  it("makes disconnected systems critical", () => {
    const result = calculateHealth({
      ...healthyInput,
      harvestConnected: false,
      qboConnected: false,
    });
    expect(result.severity).toBe("critical");
    expect(result.score).toBe(50);
    expect(result.issues.map((issue) => issue.id)).toEqual(
      expect.arrayContaining(["harvest", "qbo"])
    );
  });

  it("reports excluded hours and fixture mode as warnings", () => {
    const result = calculateHealth({
      ...healthyInput,
      source: "fixtures",
      missingRateEntries: 2,
      excludedHours: 7.5,
    });
    expect(result.severity).toBe("warning");
    expect(result.issues.map((issue) => issue.id)).toEqual(
      expect.arrayContaining(["rates", "fixtures"])
    );
    expect(result.issues.find((issue) => issue.id === "rates")?.detail).toContain("7.5");
  });
});
