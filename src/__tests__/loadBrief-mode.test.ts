import { describe, expect, it } from "vitest";
import { loadBrief, loadFixtureBrief } from "@/lib/brief";

describe("loadBrief connector switch", () => {
  it("defaults to fixtures when no DATABASE_URL / no sync", async () => {
    delete process.env.DATABASE_URL;
    const brief = await loadBrief();
    expect(brief.meta.source).toBe("fixtures");
    expect(brief.pnl.projects.length).toBeGreaterThan(0);
    expect(brief.meta.periodKey).toBe("last_week");
    expect(brief.pnl.period).toEqual({
      start: "2026-09-08",
      end: "2026-09-14",
    });
  });

  it("loadFixtureBrief always returns fixtures source", async () => {
    const brief = await loadFixtureBrief();
    expect(brief.meta.source).toBe("fixtures");
  });

  it("loadFixtureBrief respects mtd period", async () => {
    const brief = await loadFixtureBrief({ period: "mtd" });
    expect(brief.meta.periodKey).toBe("mtd");
    expect(brief.pnl.period.start).toBe("2026-09-01");
    expect(brief.pnl.period.end).toBe("2026-09-14");
    expect(brief.pnl.priorPeriod).toEqual({
      start: "2026-08-01",
      end: "2026-08-31",
    });
  });
});
