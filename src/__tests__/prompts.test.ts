import { describe, expect, it } from "vitest";
import { loadFixtureBrief, runCannedPrompt } from "@/lib/brief";

describe("canned prompt filters", () => {
  it("runs fixed intents against fixture reconciler output", async () => {
    const { pnl, meta } = await loadFixtureBrief();
    expect(meta.source).toBe("fixtures");

    const lost = runCannedPrompt("who-lost", pnl);
    expect(lost.id).toBe("who-lost");
    expect(lost.summary).toBeTruthy();

    const mtd = runCannedPrompt("project-pnl-mtd", pnl);
    expect(mtd.rows.length).toBe(pnl.projects.length);

    const unmapped = runCannedPrompt("unmapped-harvest", pnl);
    expect(
      unmapped.rows.some((r) => r.label === "h_proj_unmapped") ||
        unmapped.summary.includes("0")
    ).toBe(true);

    const rates = runCannedPrompt("missing-rates", pnl);
    expect(rates.rows.some((r) => r.label === "te5")).toBe(true);

    const gap = runCannedPrompt("labor-rev-gap", pnl);
    expect(gap.id).toBe("labor-rev-gap");
  });
});
