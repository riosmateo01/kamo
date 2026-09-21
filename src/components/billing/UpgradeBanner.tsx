import Link from "next/link";
import { CheckoutButton } from "./CheckoutButton";
import { PLAN_NAME, PLAN_PRICE_USD } from "@/lib/billing/pricing";

type Props = {
  stripeConfigured: boolean;
  hasSubscription: boolean;
};

/**
 * Soft gate: never blocks /brief. Shows upgrade nudge when no active subscription.
 * Design partners stay free — secondary CTA notes that.
 */
export function UpgradeBanner({ stripeConfigured, hasSubscription }: Props) {
  if (hasSubscription) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <span className="font-semibold">{PLAN_NAME}</span> subscription active.
        Manage billing via Customer Portal after checkout, or{" "}
        <Link href="/#pricing" className="underline underline-offset-2">
          view plan
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-900">
            Upgrade to {PLAN_NAME} — ${PLAN_PRICE_USD}/mo
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">
            Soft gate only — the brief stays open in local/dev. Design partners:
            use free while we harden live sync. No paywall enforced yet.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CheckoutButton
            stripeConfigured={stripeConfigured}
            label={
              stripeConfigured
                ? `Subscribe — $${PLAN_PRICE_USD}/mo`
                : "Configure Stripe"
            }
          />
          <Link
            href="/#pricing"
            className="text-xs font-medium text-zinc-600 underline-offset-2 hover:underline"
          >
            Design partner? See pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
