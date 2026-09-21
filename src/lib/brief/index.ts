/** Monday profit brief — load pipeline + presentational helpers. */

export { loadFixtureBrief, loadBrief } from "./loadBrief";
export type {
  BriefMeta,
  BriefPayload,
  BriefSource,
  LoadBriefOptions,
} from "./loadBrief";

export {
  formatUsd,
  formatPct,
  formatIsoDate,
  formatDateRange,
  formatGeneratedAt,
} from "./format";

export {
  deriveBriefViews,
  CANNED_PROMPTS,
  THIN_MARGIN_THRESHOLD,
} from "./views";
export type { BriefViews } from "./views";

export { runCannedPrompt } from "./prompts";
export type { PromptResult, PromptResultRow, CannedPromptId } from "./prompts";

export {
  resolvePeriods,
  resolveLastWeek,
  resolveMtd,
  resolvePriorMonth,
  resolvePriorLastWeek,
  resolvePriorSameLength,
  syncLookbackRange,
  parsePeriodKey,
  periodQueryString,
  toIsoDate,
  parseIsoDate,
  addDays,
  mondayOfWeekContaining,
  inclusiveDayCount,
  FIXTURE_AS_OF,
  PERIOD_KEYS,
} from "./period";
export type { PeriodKey, ResolvedPeriods, ResolvePeriodInput } from "./period";
