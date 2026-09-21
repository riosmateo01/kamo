import type { ReconAssertionResult, Tolerance } from "@/lib/contracts/types";

const DEFAULT: Tolerance = { absoluteUsd: 1, relativeGpPct: 0.001 };

export function assertClose(
  path: string,
  expected: number,
  actual: number,
  tolerance: Tolerance = DEFAULT,
  kind: "money" | "margin" = "money"
): ReconAssertionResult["mismatches"][number] | null {
  if (kind === "margin") {
    const ok = Math.abs(actual - expected) <= tolerance.relativeGpPct;
    if (ok) return null;
    return {
      path,
      expected,
      actual,
      message: `margin ${actual} vs ${expected} exceeds ±${tolerance.relativeGpPct}`,
    };
  }
  const ok = Math.abs(actual - expected) <= tolerance.absoluteUsd;
  if (ok) return null;
  return {
    path,
    expected,
    actual,
    message: `${actual} vs ${expected} exceeds ±$${tolerance.absoluteUsd}`,
  };
}

export function collectMismatches(
  pairs: Array<{
    path: string;
    expected: number;
    actual: number;
    kind?: "money" | "margin";
  }>,
  tolerance: Tolerance = DEFAULT
): ReconAssertionResult {
  const mismatches = pairs
    .map((p) =>
      assertClose(p.path, p.expected, p.actual, tolerance, p.kind ?? "money")
    )
    .filter((m): m is NonNullable<typeof m> => m !== null);
  return { ok: mismatches.length === 0, mismatches };
}
