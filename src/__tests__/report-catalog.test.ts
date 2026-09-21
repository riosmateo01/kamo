import { describe, expect, it } from "vitest";
import { reportAvailability } from "@/lib/reports/catalog";

describe("report catalogue coverage", () => {
  it("unlocks the existing wedge reports with accounting and time", () => {
    const reports = reportAvailability(["accounting", "time_tracking"]);
    expect(reports.find((report) => report.id === "project-profitability")?.ready).toBe(true);
    expect(reports.find((report) => report.id === "margin-risk")?.ready).toBe(true);
    expect(reports.find((report) => report.id === "utilization")?.ready).toBe(false);
  });

  it("names every missing domain", () => {
    const report = reportAvailability(["accounting"]).find(
      (candidate) => candidate.id === "true-labor-margin"
    );
    expect(report?.missingDomains).toEqual(["time_tracking", "payroll"]);
  });
});
