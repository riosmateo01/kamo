/**
 * Brief period resolution.
 *
 * Rules (documented):
 * - **last_week**: prior calendar week **Monday–Sunday** (week containing `asOf`
 *   starts Monday; last_week is the seven days before that Monday).
 * - **mtd**: month-to-date — 1st of `asOf`'s month through `asOf` (inclusive).
 * - **custom**: explicit `start`/`end` (inclusive ISO dates); prior = same-length
 *   window ending the day before `start`.
 *
 * Prior periods:
 * - last_week → the Mon–Sun week immediately before current last_week
 * - mtd → previous full calendar month
 * - custom → contiguous same-length range before start
 *
 * Sync lookback: last ~60 calendar days ending on `asOf` (wide pull; brief
 * aggregation still filters to the selected period).
 *
 * Sandbox fixtures are dated 2026-09-01…14. Fixture mode pins `asOf` to
 * 2026-09-14 so last_week aligns with the fixture current week window used by
 * expected-pnl (see FIXTURE_AS_OF). Live mode uses real today.
 */

import type { DateRange, IsoDate } from "@/lib/contracts/types";

export type PeriodKey = "last_week" | "mtd" | "custom";

export const PERIOD_KEYS: PeriodKey[] = ["last_week", "mtd", "custom"];

/** Default as-of for fixture MTD (covers all sandbox rows through mid-Sep 2026). */
export const FIXTURE_AS_OF = "2026-09-14";

export type ResolvedPeriods = {
  key: PeriodKey;
  current: DateRange;
  prior: DateRange;
  /** Human label for empty states / header */
  label: string;
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar YYYY-MM-DD (no UTC shift). */
export function toIsoDate(d: Date): IsoDate {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseIsoDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + n);
  return out;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Monday of the week containing `d` (Mon=start). */
export function mondayOfWeekContaining(d: Date): Date {
  const day = d.getDay(); // 0 Sun … 6 Sat
  const daysSinceMonday = (day + 6) % 7;
  return addDays(startOfLocalDay(d), -daysSinceMonday);
}

/**
 * Prior Mon–Sun calendar week relative to `asOf`.
 * Example: asOf = Sun 2026-09-20 → this week Mon 09-14…Sun 09-20 →
 * last_week = Mon 09-07…Sun 09-13.
 */
export function resolveLastWeek(asOf: Date): DateRange {
  const thisMonday = mondayOfWeekContaining(asOf);
  const lastMonday = addDays(thisMonday, -7);
  const lastSunday = addDays(lastMonday, 6);
  return { start: toIsoDate(lastMonday), end: toIsoDate(lastSunday) };
}

export function resolvePriorLastWeek(current: DateRange): DateRange {
  const start = addDays(parseIsoDate(current.start), -7);
  const end = addDays(parseIsoDate(current.end), -7);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

/** Month-to-date: 1st of month → asOf inclusive. */
export function resolveMtd(asOf: Date): DateRange {
  const start = new Date(asOf.getFullYear(), asOf.getMonth(), 1);
  return { start: toIsoDate(start), end: toIsoDate(startOfLocalDay(asOf)) };
}

/** Previous full calendar month. */
export function resolvePriorMonth(asOf: Date): DateRange {
  const firstThis = new Date(asOf.getFullYear(), asOf.getMonth(), 1);
  const lastPrior = addDays(firstThis, -1);
  const firstPrior = new Date(lastPrior.getFullYear(), lastPrior.getMonth(), 1);
  return { start: toIsoDate(firstPrior), end: toIsoDate(lastPrior) };
}

export function inclusiveDayCount(range: DateRange): number {
  const a = parseIsoDate(range.start).getTime();
  const b = parseIsoDate(range.end).getTime();
  return Math.floor((b - a) / 86_400_000) + 1;
}

/** Same-length window ending the day before `range.start`. */
export function resolvePriorSameLength(range: DateRange): DateRange {
  const days = inclusiveDayCount(range);
  const end = addDays(parseIsoDate(range.start), -1);
  const start = addDays(end, -(days - 1));
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

export function syncLookbackRange(
  asOf: Date = new Date(),
  days = 60
): DateRange {
  const end = startOfLocalDay(asOf);
  const start = addDays(end, -(days - 1));
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

export function parsePeriodKey(
  raw: string | null | undefined
): PeriodKey {
  if (raw === "mtd" || raw === "custom" || raw === "last_week") return raw;
  return "last_week";
}

export type ResolvePeriodInput = {
  period?: string | null;
  start?: string | null;
  end?: string | null;
  asOf?: Date | string;
  /**
   * When true (fixture pipeline), last_week uses the sandbox expected window
   * 2026-09-08…14 / prior 09-01…07 so demos match expected-pnl.json.
   * MTD/custom still resolve from asOf (default FIXTURE_AS_OF).
   */
  fixtureAligned?: boolean;
};

const FIXTURE_CURRENT: DateRange = {
  start: "2026-09-08",
  end: "2026-09-14",
};
const FIXTURE_PRIOR: DateRange = {
  start: "2026-09-01",
  end: "2026-09-07",
};

function asOfDate(input?: Date | string): Date {
  if (!input) return new Date();
  if (typeof input === "string") return parseIsoDate(input);
  return startOfLocalDay(input);
}

function isIso(s: string | null | undefined): s is IsoDate {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function resolvePeriods(input: ResolvePeriodInput = {}): ResolvedPeriods {
  const key = parsePeriodKey(input.period);
  const asOf = asOfDate(
    input.asOf ?? (input.fixtureAligned ? FIXTURE_AS_OF : undefined)
  );

  if (key === "custom" && isIso(input.start) && isIso(input.end)) {
    const current: DateRange = { start: input.start, end: input.end };
    if (parseIsoDate(current.end) < parseIsoDate(current.start)) {
      // swap if reversed
      current.start = input.end;
      current.end = input.start;
    }
    const prior = resolvePriorSameLength(current);
    return {
      key: "custom",
      current,
      prior,
      label: "Custom range",
    };
  }

  if (key === "mtd") {
    const current = resolveMtd(asOf);
    const prior = resolvePriorMonth(asOf);
    return {
      key: "mtd",
      current,
      prior,
      label: "Month to date",
    };
  }

  // last_week (default). Incomplete custom falls back to last_week ranges
  // but keeps key=custom so the picker stays on the custom form.
  const useFixtureWeek = !!input.fixtureAligned;
  const current = useFixtureWeek ? FIXTURE_CURRENT : resolveLastWeek(asOf);
  const prior = useFixtureWeek ? FIXTURE_PRIOR : resolvePriorLastWeek(current);
  if (key === "custom") {
    return {
      key: "custom",
      current,
      prior,
      label: "Custom range",
    };
  }
  return {
    key: "last_week",
    current,
    prior,
    label: "Last week",
  };
}

export function periodQueryString(
  key: PeriodKey,
  custom?: { start?: string; end?: string }
): string {
  const params = new URLSearchParams();
  params.set("period", key);
  if (key === "custom" && custom?.start && custom?.end) {
    params.set("start", custom.start);
    params.set("end", custom.end);
  }
  return params.toString();
}
