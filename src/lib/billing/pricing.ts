/**
 * Public pricing constants for Kamo subscription tiers.
 * Stripe Price IDs live in env — create in Dashboard (see GO-LIVE.md).
 *   brief  → STRIPE_PRICE_ID         ($49/mo)
 *   studio → STRIPE_PRICE_ID_STUDIO  ($149/mo)
 */

export type PlanId = "brief" | "studio";

export const PLAN_IDS = ["brief", "studio"] as const;

export function isPlanId(value: unknown): value is PlanId {
  return value === "brief" || value === "studio";
}

export function parsePlanId(value: unknown, fallback: PlanId = "brief"): PlanId {
  if (isPlanId(value)) return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (isPlanId(v)) return v;
  }
  return fallback;
}

/** @deprecated Prefer PLANS.brief.name — kept for UpgradeBanner / legacy imports */
export const PLAN_NAME = "Kamo";

/** Display price in USD per month (brief / default) */
export const PLAN_PRICE_USD = 49;

/** Amount in cents for documentation / tests (Stripe Price is authoritative) */
export const PLAN_PRICE_CENTS = 4900;

export const PLAN_INTERVAL = "month" as const;

export const PLAN_TAGLINE =
  "Reconciled QBO + Harvest Monday profit brief for your agency.";

export const PLAN_FEATURES = [
  "Connect QuickBooks Online + Harvest (OAuth)",
  "Reconciled client & project P&L (revenue, labor, GP$ / GP%)",
  "Last week, MTD, and custom periods",
  "Winners / losers / thin-margin watchlist",
  "Needs-review queue for unmapped entities",
  "Canned prompts on the same numbers — not open GenBI",
] as const;

export const PLAN_NOT_INCLUDED =
  "open GenBI chat, PSA, time UI, scheduling, or invoicing.";

/** Studio tier display */
export const STUDIO_PLAN_NAME = "Kamo Studio";
export const STUDIO_PRICE_USD = 149;
export const STUDIO_PRICE_CENTS = 14900;

export const STUDIO_PLAN_FEATURES = [
  "Everything in Kamo (Monday Brief)",
  "Additional R→F→O rituals on the same fabric",
  "Second workflows (e.g. margin-risk exception playbook)",
  "Exception alerts (Slack / email triggers)",
  "Expanded orchestration — more included after",
] as const;

export const STUDIO_NOT_INCLUDED =
  "open GenBI chat, PSA, time UI, scheduling, invoicing, or warehouse marketplace.";

export const PLANS = {
  brief: {
    id: "brief" as const,
    name: PLAN_NAME,
    subtitle: "Monday Brief",
    priceUsd: PLAN_PRICE_USD,
    priceCents: PLAN_PRICE_CENTS,
    interval: PLAN_INTERVAL,
    features: PLAN_FEATURES,
    notIncluded: PLAN_NOT_INCLUDED,
    envKey: "STRIPE_PRICE_ID" as const,
    productMeta: "monday_brief",
  },
  studio: {
    id: "studio" as const,
    name: STUDIO_PLAN_NAME,
    subtitle: "Brief + R→F→O rituals",
    priceUsd: STUDIO_PRICE_USD,
    priceCents: STUDIO_PRICE_CENTS,
    interval: PLAN_INTERVAL,
    features: STUDIO_PLAN_FEATURES,
    notIncluded: STUDIO_NOT_INCLUDED,
    envKey: "STRIPE_PRICE_ID_STUDIO" as const,
    productMeta: "kamo_studio",
  },
} as const;
