import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { upsertSubscriptionFromStripe } from "@/lib/billing/subscription";
import { appendAuditEvent } from "@/lib/audit/events";

export const dynamic = "force-dynamic";

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

/**
 * POST /api/stripe/webhook
 * Production: requires STRIPE_WEBHOOK_SECRET + constructEvent (unsigned rejected).
 * Dev: unsigned only if STRIPE_WEBHOOK_ALLOW_UNSIGNED=1 (default off).
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const allowUnsigned =
    process.env.STRIPE_WEBHOOK_ALLOW_UNSIGNED === "1" && !isProductionRuntime();

  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe not configured", stub: true },
      { status: 503 }
    );
  }

  const rawBody = await req.text();
  let event: Stripe.Event;

  if (webhookSecret) {
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
    }
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid signature";
      console.error("[stripe/webhook] signature", message);
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } else if (isProductionRuntime()) {
    return NextResponse.json(
      {
        error:
          "STRIPE_WEBHOOK_SECRET required in production — unsigned webhooks rejected",
      },
      { status: 400 }
    );
  } else if (!allowUnsigned) {
    return NextResponse.json(
      {
        error:
          "STRIPE_WEBHOOK_SECRET unset. Set it, or set STRIPE_WEBHOOK_ALLOW_UNSIGNED=1 for local unsigned payloads only.",
      },
      { status: 400 }
    );
  } else {
    console.warn(
      "[stripe/webhook] accepting unsigned payload (STRIPE_WEBHOOK_ALLOW_UNSIGNED=1, non-production)"
    );
    try {
      event = JSON.parse(rawBody) as Stripe.Event;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id;
          const orgId =
            session.metadata?.organization_id ||
            session.client_reference_id ||
            "";
          if (customerId && subId) {
            const sub = await stripe.subscriptions.retrieve(subId);
            await persistSubscription(sub, customerId, orgId);
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const orgId = sub.metadata?.organization_id || "";
        await persistSubscription(sub, customerId, orgId);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function persistSubscription(
  sub: Stripe.Subscription,
  customerId: string,
  organizationId: string
) {
  const orgId =
    organizationId ||
    (sub.metadata?.organization_id as string | undefined) ||
    "legacy";
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const periodEndSec =
    (sub as { current_period_end?: number }).current_period_end ?? null;
  await upsertSubscriptionFromStripe({
    organizationId: orgId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    status: sub.status,
    priceId,
    currentPeriodEnd: periodEndSec ? new Date(periodEndSec * 1000) : null,
    metadata: {
      ...((sub.metadata as Record<string, unknown>) ?? {}),
      organization_id: orgId,
    },
  });
  await appendAuditEvent({
    organizationId: orgId,
    actorUserId: null,
    action: "webhook.subscription",
    resource: `subscription:${sub.id}`,
    meta: { status: sub.status, customerId },
  });
}
