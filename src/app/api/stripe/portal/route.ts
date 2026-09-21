import { NextResponse } from "next/server";
import { getAppBaseUrl, getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { getSubscriptionForOrg } from "@/lib/billing/subscription";
import { isOrgResult, requireOrg } from "@/lib/auth/require-org";
import { runWithOrgAsync } from "@/lib/auth/org-context";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/portal
 * Opens Customer Portal using the org's mapped Stripe customer — never body.customerId.
 */
export async function POST() {
  const org = await requireOrg();
  if (!isOrgResult(org)) return org;

  return runWithOrgAsync(org, async () => {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        {
          error: "Stripe is not configured",
          code: "not_configured",
          demo: true,
        },
        { status: 503 }
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe client unavailable", code: "not_configured" },
        { status: 503 }
      );
    }

    const snap = await getSubscriptionForOrg(org.orgId);
    const customerId = snap?.stripeCustomerId ?? undefined;

    if (!customerId) {
      return NextResponse.json(
        {
          error: "No Stripe customer on file for this organization. Complete checkout first.",
          code: "no_customer",
        },
        { status: 400 }
      );
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${getAppBaseUrl()}/brief`,
      });
      return NextResponse.json({ url: session.url });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Portal failed";
      console.error("[stripe/portal]", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
