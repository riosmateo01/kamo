import { describe, expect, it } from "vitest";
import { planQuestion } from "@/lib/ask/query";

describe("constrained Ask planner", () => {
  it("plans a bounded client gross-profit query", () => {
    expect(planQuestion("Show the top 5 clients by gross profit")).toEqual({
      measure: "gross_profit",
      dimension: "client",
      order: "desc",
      limit: 5,
      negativeOnly: false,
    });
  });

  it("recognizes lowest project margin", () => {
    const query = planQuestion("Which projects had the lowest margin?");
    expect(query.measure).toBe("gross_margin");
    expect(query.dimension).toBe("project");
    expect(query.order).toBe("asc");
  });

  it("recognizes underwater filters", () => {
    expect(planQuestion("Which clients were underwater?").negativeOnly).toBe(true);
  });

  it("caps result limits", () => {
    expect(planQuestion("Show top 99 projects by revenue").limit).toBe(25);
  });
});
