/**
 * Stripe helpers — soft-fail when keys are missing (local/demo never crashes).
 */

import Stripe from "stripe";
import {
  PLAN_INTERVAL,
  PLAN_NAME,
  PLAN_PRICE_CENTS,
  PLAN_PRICE_USD,
  PLANS,
  parsePlanId,
  type PlanId,
} from "./pricing";

export type StripeConfigStatus = {
  configured: boolean;
  missing: string[];
  publishableKey: string | null;
  priceId: string | null;
  studioPriceId: string | null;
  appBaseUrl: string;
};

let stripeSingleton: Stripe | null = null;

export function getAppBaseUrl(): string {
  const fromEnv = process.env.APP_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

function priceEnvForPlan(plan: PlanId): string {
  const key = PLANS[plan].envKey;
  return process.env[key]?.trim() ?? "";
}

export function getStripeConfigStatus(): StripeConfigStatus {
  const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const priceId = process.env.STRIPE_PRICE_ID?.trim() ?? "";
  const studioPriceId = process.env.STRIPE_PRICE_ID_STUDIO?.trim() ?? "";
  const publishable =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
    process.env.STRIPE_PUBLISHABLE_KEY?.trim() ||
    "";

  const missing: string[] = [];
  if (!secret) missing.push("STRIPE_SECRET_KEY");
  if (!priceId) missing.push("STRIPE_PRICE_ID");
  if (!publishable) missing.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");

  return {
    configured: Boolean(secret && priceId),
    missing,
    publishableKey: publishable || null,
    priceId: priceId || null,
    studioPriceId: studioPriceId || null,
    appBaseUrl: getAppBaseUrl(),
  };
}

export function isStripeConfigured(): boolean {
  return getStripeConfigStatus().configured;
}

/** True when secret + the price for that plan are set. */
export function isPlanCheckoutReady(plan: PlanId = "brief"): boolean {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const priceId = priceEnvForPlan(plan);
  return Boolean(secret && priceId);
}

/** Server-side Stripe client, or null if secret missing. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: "2025-08-27.basil",
      typescript: true,
    });
  }
  return stripeSingleton;
}

/**
 * Guard for checkout: returns an error message if checkout cannot proceed,
 * or null when OK. Used by API route and unit tests.
 *
 * Default plan is `brief` → STRIPE_PRICE_ID.
 * `studio` → STRIPE_PRICE_ID_STUDIO (validated only when studio is requested).
 */
export function checkoutGuard(
  planInput: unknown = "brief"
):
  | { ok: true; plan: PlanId; priceId: string; appBaseUrl: string }
  | {
      ok: false;
      error: string;
      code: "not_configured" | "missing_price";
      plan: PlanId;
    } {
  const plan = parsePlanId(planInput, "brief");
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const priceId = priceEnvForPlan(plan);
  const envKey = PLANS[plan].envKey;

  if (!secret) {
    return {
      ok: false,
      plan,
      error:
        "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID (see GO-LIVE.md).",
      code: "not_configured",
    };
  }
  if (!priceId) {
    const hint =
      plan === "studio"
        ? "Create a $149/mo recurring Price for Kamo Studio in Stripe Dashboard and set STRIPE_PRICE_ID_STUDIO."
        : "Create a $49/mo recurring Price in Stripe Dashboard and set the env var.";
    return {
      ok: false,
      plan,
      error: `${envKey} is missing. ${hint}`,
      code: "missing_price",
    };
  }
  return { ok: true, plan, priceId, appBaseUrl: getAppBaseUrl() };
}

export function expectedPlanMeta(plan: PlanId = "brief") {
  const p = PLANS[plan];
  return {
    name: p.name,
    amountCents: p.priceCents,
    amountUsd: p.priceUsd,
    interval: p.interval,
    plan: p.id,
  };
}

/** Legacy meta for $49 brief (tests / callers that don't pass plan). */
export function expectedBriefPlanMeta() {
  return {
    name: PLAN_NAME,
    amountCents: PLAN_PRICE_CENTS,
    amountUsd: PLAN_PRICE_USD,
    interval: PLAN_INTERVAL,
  };
}
