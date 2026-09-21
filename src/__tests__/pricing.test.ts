import { afterEach, describe, expect, it } from "vitest";
import {
  PLAN_INTERVAL,
  PLAN_NAME,
  PLAN_PRICE_CENTS,
  PLAN_PRICE_USD,
  PLANS,
  STUDIO_PLAN_NAME,
  STUDIO_PRICE_CENTS,
  STUDIO_PRICE_USD,
  parsePlanId,
} from "@/lib/billing/pricing";
import {
  checkoutGuard,
  expectedBriefPlanMeta,
  expectedPlanMeta,
  getStripeConfigStatus,
  isPlanCheckoutReady,
  isStripeConfigured,
} from "@/lib/billing/stripe";
import { isActiveStatus } from "@/lib/billing/subscription";

const STRIPE_ENV = [
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_ID",
  "STRIPE_PRICE_ID_STUDIO",
  "STRIPE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "APP_BASE_URL",
] as const;

const saved: Record<string, string | undefined> = {};

function stashEnv() {
  for (const k of STRIPE_ENV) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
}

function restoreEnv() {
  for (const k of STRIPE_ENV) {
    const v = saved[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

afterEach(() => {
  restoreEnv();
});

describe("pricing constants", () => {
  it("Kamo brief plan is $49/mo (4900 cents)", () => {
    expect(PLAN_NAME).toBe("Kamo");
    expect(PLAN_PRICE_USD).toBe(49);
    expect(PLAN_PRICE_CENTS).toBe(4900);
    expect(PLAN_INTERVAL).toBe("month");
    expect(PLANS.brief.priceUsd).toBe(49);
    expect(expectedBriefPlanMeta()).toEqual({
      name: "Kamo",
      amountCents: 4900,
      amountUsd: 49,
      interval: "month",
    });
    expect(expectedPlanMeta("brief")).toEqual({
      name: "Kamo",
      amountCents: 4900,
      amountUsd: 49,
      interval: "month",
      plan: "brief",
    });
  });

  it("Kamo Studio plan is $149/mo (14900 cents)", () => {
    expect(STUDIO_PLAN_NAME).toBe("Kamo Studio");
    expect(STUDIO_PRICE_USD).toBe(149);
    expect(STUDIO_PRICE_CENTS).toBe(14900);
    expect(PLANS.studio.envKey).toBe("STRIPE_PRICE_ID_STUDIO");
    expect(expectedPlanMeta("studio")).toEqual({
      name: "Kamo Studio",
      amountCents: 14900,
      amountUsd: 149,
      interval: "month",
      plan: "studio",
    });
  });

  it("parsePlanId defaults to brief", () => {
    expect(parsePlanId(undefined)).toBe("brief");
    expect(parsePlanId("studio")).toBe("studio");
    expect(parsePlanId("BRIEF")).toBe("brief");
    expect(parsePlanId("nope")).toBe("brief");
  });
});

describe("checkoutGuard", () => {
  it("fails soft when Stripe secret missing (demo mode)", () => {
    stashEnv();
    const result = checkoutGuard();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("not_configured");
      expect(result.plan).toBe("brief");
      expect(result.error).toMatch(/Stripe is not configured/i);
    }
    expect(isStripeConfigured()).toBe(false);
    const status = getStripeConfigStatus();
    expect(status.configured).toBe(false);
    expect(status.missing).toContain("STRIPE_SECRET_KEY");
    expect(status.missing).toContain("STRIPE_PRICE_ID");
  });

  it("fails when secret set but brief price id missing", () => {
    stashEnv();
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    const result = checkoutGuard("brief");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("missing_price");
      expect(result.plan).toBe("brief");
      expect(result.error).toMatch(/STRIPE_PRICE_ID/i);
    }
  });

  it("passes brief when secret + STRIPE_PRICE_ID present (studio env not required)", () => {
    stashEnv();
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.STRIPE_PRICE_ID = "price_dummy49";
    process.env.APP_BASE_URL = "https://example.com";
    const result = checkoutGuard();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan).toBe("brief");
      expect(result.priceId).toBe("price_dummy49");
      expect(result.appBaseUrl).toBe("https://example.com");
    }
    expect(isStripeConfigured()).toBe(true);
    expect(isPlanCheckoutReady("brief")).toBe(true);
    expect(isPlanCheckoutReady("studio")).toBe(false);
  });

  it("validates STRIPE_PRICE_ID_STUDIO only when studio plan requested", () => {
    stashEnv();
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.STRIPE_PRICE_ID = "price_dummy49";
    // no studio price
    const briefOk = checkoutGuard("brief");
    expect(briefOk.ok).toBe(true);

    const studioMissing = checkoutGuard("studio");
    expect(studioMissing.ok).toBe(false);
    if (!studioMissing.ok) {
      expect(studioMissing.code).toBe("missing_price");
      expect(studioMissing.plan).toBe("studio");
      expect(studioMissing.error).toMatch(/STRIPE_PRICE_ID_STUDIO/i);
    }

    process.env.STRIPE_PRICE_ID_STUDIO = "price_dummy149";
    process.env.APP_BASE_URL = "https://example.com";
    const studioOk = checkoutGuard("studio");
    expect(studioOk.ok).toBe(true);
    if (studioOk.ok) {
      expect(studioOk.plan).toBe("studio");
      expect(studioOk.priceId).toBe("price_dummy149");
    }
    expect(isPlanCheckoutReady("studio")).toBe(true);
  });
});

describe("subscription status helpers", () => {
  it("treats active and trialing as subscribed", () => {
    expect(isActiveStatus("active")).toBe(true);
    expect(isActiveStatus("trialing")).toBe(true);
    expect(isActiveStatus("canceled")).toBe(false);
    expect(isActiveStatus(null)).toBe(false);
  });
});
