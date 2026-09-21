import { NextResponse } from "next/server";
import { checkoutGuard, getStripe } from "@/lib/billing/stripe";
import { PLANS, parsePlanId } from "@/lib/billing/pricing";
import {
  getSubscriptionForOrg,
} from "@/lib/billing/subscription";
import { isOrgResult, requireOrg } from "@/lib/auth/require-org";
import { runWithOrgAsync } from "@/lib/auth/org-context";
import { appendAuditEvent } from "@/lib/audit/events";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/checkout
 * Creates Checkout Session for the authenticated Clerk organization.
 * Never trusts client-supplied Stripe customer IDs — maps from org server-side.
 */
export async function POST(req: Request) {
  const org = await requireOrg();
  if (!isOrgResult(org)) return org;

  return runWithOrgAsync(org, async () => {
    const url = new URL(req.url);
    let email: string | undefined;
    let planRaw: unknown = url.searchParams.get("plan");

    try {
      const body = (await req.json().catch(() => ({}))) as {
        email?: string;
        plan?: string;
        customerId?: string;
      };
      // Explicitly ignore any client-supplied customerId
      if (typeof body.email === "string" && body.email.includes("@")) {
        email = body.email.trim();
      }
      if (body.plan != null) planRaw = body.plan;
    } catch {
      /* empty body OK */
    }

    const plan = parsePlanId(planRaw, "brief");
    const guard = checkoutGuard(plan);
    if (!guard.ok) {
      return NextResponse.json(
        {
          error: guard.error,
          code: guard.code,
          plan: guard.plan,
          demo: true,
          hint: "See GO-LIVE.md — create Product/Price in Stripe Dashboard, set STRIPE_* env vars.",
        },
        { status: 503 }
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe client unavailable", code: "not_configured", demo: true },
        { status: 503 }
      );
    }

    const planMeta = PLANS[guard.plan];
    const existing = await getSubscriptionForOrg(org.orgId);

    let customerId = existing?.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        ...(email ? { email } : {}),
        metadata: { organization_id: org.orgId },
      });
      customerId = customer.id;
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        client_reference_id: org.orgId,
        line_items: [{ price: guard.priceId, quantity: 1 }],
        success_url: `${guard.appBaseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${guard.appBaseUrl}/billing/cancel`,
        allow_promotion_codes: true,
        metadata: {
          organization_id: org.orgId,
          plan: planMeta.name,
          plan_id: planMeta.id,
          product: planMeta.productMeta,
        },
        subscription_data: {
          metadata: {
            organization_id: org.orgId,
            plan: planMeta.name,
            plan_id: planMeta.id,
            product: planMeta.productMeta,
          },
        },
      });

      if (!session.url) {
        return NextResponse.json(
          { error: "Checkout session missing URL" },
          { status: 500 }
        );
      }

      await appendAuditEvent({
        organizationId: org.orgId,
        actorUserId: org.userId,
        action: "checkout.create",
        resource: `checkout:${session.id}`,
        meta: { plan: guard.plan, customerId },
      });

      return NextResponse.json({
        url: session.url,
        id: session.id,
        plan: guard.plan,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Checkout failed";
      console.error("[stripe/checkout]", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
