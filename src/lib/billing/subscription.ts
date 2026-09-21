/**
 * Organization-scoped subscription helpers. Soft-fail when DB unavailable.
 */

import { desc, eq } from "drizzle-orm";
import { getDb, markDbUnavailable } from "@/db/client";
import { subscriptions } from "@/db/schema";
import { newId } from "@/lib/sync/id";
import { getOrgIdOrNull } from "@/lib/auth/org-context";

export type SubscriptionSnapshot = {
  organizationId: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  priceId: string | null;
  currentPeriodEnd: Date | null;
};

const ACTIVE = new Set(["active", "trialing"]);

export function isActiveStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return ACTIVE.has(status);
}

export async function getSubscriptionForOrg(
  organizationId: string
): Promise<SubscriptionSnapshot | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .orderBy(desc(subscriptions.updatedAt))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      organizationId: row.organizationId,
      status: row.status,
      stripeCustomerId: row.stripeCustomerId,
      stripeSubscriptionId: row.stripeSubscriptionId,
      priceId: row.priceId,
      currentPeriodEnd: row.currentPeriodEnd,
    };
  } catch {
    markDbUnavailable();
    return null;
  }
}

/** @deprecated Prefer getSubscriptionForOrg(orgId) */
export async function getLatestSubscription(
  organizationId?: string
): Promise<SubscriptionSnapshot | null> {
  const orgId = organizationId ?? getOrgIdOrNull();
  if (!orgId) return null;
  return getSubscriptionForOrg(orgId);
}

export async function hasActiveSubscription(
  organizationId?: string
): Promise<boolean> {
  const orgId = organizationId ?? getOrgIdOrNull();
  if (!orgId) return false;
  const snap = await getSubscriptionForOrg(orgId);
  return isActiveStatus(snap?.status);
}

export async function getOrCreateStripeCustomerId(input: {
  organizationId: string;
  email?: string | null;
  createCustomer: (params: {
    email?: string;
    metadata: Record<string, string>;
  }) => Promise<{ id: string }>;
}): Promise<string | null> {
  const existing = await getSubscriptionForOrg(input.organizationId);
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  // No subscription row yet — customer created at checkout time only.
  // Caller creates Stripe customer; we do not invent ids from the client.
  const customer = await input.createCustomer({
    email: input.email ?? undefined,
    metadata: { organization_id: input.organizationId },
  });
  return customer.id;
}

export async function upsertSubscriptionFromStripe(input: {
  organizationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  priceId?: string | null;
  currentPeriodEnd?: Date | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const db = getDb();
  if (!db) {
    console.info(
      "[billing] DATABASE_URL unset — webhook accepted but subscription not persisted"
    );
    return;
  }
  try {
    const bySub = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, input.stripeSubscriptionId))
      .limit(1);

    const now = new Date();
    if (bySub[0]) {
      await db
        .update(subscriptions)
        .set({
          organizationId: input.organizationId || bySub[0].organizationId,
          status: input.status,
          stripeCustomerId: input.stripeCustomerId,
          priceId: input.priceId ?? bySub[0].priceId,
          currentPeriodEnd:
            input.currentPeriodEnd ?? bySub[0].currentPeriodEnd,
          metadata: input.metadata ?? bySub[0].metadata,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, bySub[0].id));
      return;
    }

    const byOrg = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, input.organizationId))
      .limit(1);

    if (byOrg[0]) {
      await db
        .update(subscriptions)
        .set({
          stripeCustomerId: input.stripeCustomerId,
          stripeSubscriptionId: input.stripeSubscriptionId,
          status: input.status,
          priceId: input.priceId ?? byOrg[0].priceId,
          currentPeriodEnd:
            input.currentPeriodEnd ?? byOrg[0].currentPeriodEnd,
          metadata: input.metadata ?? byOrg[0].metadata,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, byOrg[0].id));
      return;
    }

    await db.insert(subscriptions).values({
      id: newId("sub"),
      organizationId: input.organizationId,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      status: input.status,
      priceId: input.priceId ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      metadata: input.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    console.error("[billing] upsertSubscriptionFromStripe failed", err);
    markDbUnavailable();
  }
}
