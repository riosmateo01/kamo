import { describe, expect, it } from "vitest";
import {
  resolveLastWeek,
  resolveMtd,
  resolvePriorMonth,
  resolvePriorLastWeek,
  resolvePriorSameLength,
  resolvePeriods,
  syncLookbackRange,
  parsePeriodKey,
  parseIsoDate,
  inclusiveDayCount,
  mondayOfWeekContaining,
  toIsoDate,
} from "@/lib/brief/period";

describe("period helpers", () => {
  it("parsePeriodKey defaults to last_week", () => {
    expect(parsePeriodKey(undefined)).toBe("last_week");
    expect(parsePeriodKey("nope")).toBe("last_week");
    expect(parsePeriodKey("mtd")).toBe("mtd");
    expect(parsePeriodKey("custom")).toBe("custom");
  });

  it("mondayOfWeekContaining finds Monday", () => {
    // Sun 2026-09-20 → Mon 2026-09-14
    expect(toIsoDate(mondayOfWeekContaining(parseIsoDate("2026-09-20")))).toBe(
      "2026-09-14"
    );
    // Mon 2026-09-14 → itself
    expect(toIsoDate(mondayOfWeekContaining(parseIsoDate("2026-09-14")))).toBe(
      "2026-09-14"
    );
    // Wed 2026-09-16 → Mon 2026-09-14
    expect(toIsoDate(mondayOfWeekContaining(parseIsoDate("2026-09-16")))).toBe(
      "2026-09-14"
    );
  });

  it("last_week is prior Mon–Sun calendar week", () => {
    // asOf Sun 2026-09-20 → this week Mon 09-14…Sun 09-20 → last = Mon 09-07…Sun 09-13
    const r = resolveLastWeek(parseIsoDate("2026-09-20"));
    expect(r).toEqual({ start: "2026-09-07", end: "2026-09-13" });
    expect(inclusiveDayCount(r)).toBe(7);

    // asOf Mon 2026-09-21 → last = Mon 09-14…Sun 09-20
    expect(resolveLastWeek(parseIsoDate("2026-09-21"))).toEqual({
      start: "2026-09-14",
      end: "2026-09-20",
    });
  });

  it("prior last_week is the week before", () => {
    const current = { start: "2026-09-07", end: "2026-09-13" };
    expect(resolvePriorLastWeek(current)).toEqual({
      start: "2026-08-31",
      end: "2026-09-06",
    });
  });

  it("mtd is 1st of month through asOf", () => {
    expect(resolveMtd(parseIsoDate("2026-09-20"))).toEqual({
      start: "2026-09-01",
      end: "2026-09-20",
    });
    expect(resolveMtd(parseIsoDate("2026-09-01"))).toEqual({
      start: "2026-09-01",
      end: "2026-09-01",
    });
  });

  it("prior for mtd is previous full calendar month", () => {
    expect(resolvePriorMonth(parseIsoDate("2026-09-20"))).toEqual({
      start: "2026-08-01",
      end: "2026-08-31",
    });
    expect(resolvePriorMonth(parseIsoDate("2026-01-15"))).toEqual({
      start: "2025-12-01",
      end: "2025-12-31",
    });
  });

  it("custom prior is same-length window before start", () => {
    const current = { start: "2026-09-10", end: "2026-09-12" }; // 3 days
    expect(resolvePriorSameLength(current)).toEqual({
      start: "2026-09-07",
      end: "2026-09-09",
    });
  });

  it("resolvePeriods last_week live uses Mon–Sun", () => {
    const r = resolvePeriods({
      period: "last_week",
      asOf: "2026-09-20",
    });
    expect(r.key).toBe("last_week");
    expect(r.current).toEqual({ start: "2026-09-07", end: "2026-09-13" });
    expect(r.prior).toEqual({ start: "2026-08-31", end: "2026-09-06" });
    expect(r.label).toBe("Last week");
  });

  it("resolvePeriods fixtureAligned last_week uses sandbox expected window", () => {
    const r = resolvePeriods({
      period: "last_week",
      fixtureAligned: true,
    });
    expect(r.current).toEqual({ start: "2026-09-08", end: "2026-09-14" });
    expect(r.prior).toEqual({ start: "2026-09-01", end: "2026-09-07" });
  });

  it("resolvePeriods mtd + fixture asOf covers Sep 1–14", () => {
    const r = resolvePeriods({
      period: "mtd",
      fixtureAligned: true,
    });
    expect(r.key).toBe("mtd");
    expect(r.current).toEqual({ start: "2026-09-01", end: "2026-09-14" });
    expect(r.prior).toEqual({ start: "2026-08-01", end: "2026-08-31" });
  });

  it("resolvePeriods custom uses start/end + same-length prior", () => {
    const r = resolvePeriods({
      period: "custom",
      start: "2026-09-08",
      end: "2026-09-14",
    });
    expect(r.key).toBe("custom");
    expect(r.current).toEqual({ start: "2026-09-08", end: "2026-09-14" });
    expect(r.prior).toEqual({ start: "2026-09-01", end: "2026-09-07" });
  });

  it("syncLookbackRange covers ~60 days ending asOf", () => {
    const r = syncLookbackRange(parseIsoDate("2026-09-20"), 60);
    expect(r.end).toBe("2026-09-20");
    expect(inclusiveDayCount(r)).toBe(60);
    expect(r.start).toBe("2026-07-23");
  });
});
