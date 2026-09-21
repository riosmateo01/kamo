"use client";

import { useState } from "react";
import type { PlanId } from "@/lib/billing/pricing";

type Props = {
  /** When false, button shows Configure Stripe / demo label and does not call API */
  stripeConfigured: boolean;
  /** Checkout plan — default brief ($49). studio → $149 Studio price. */
  plan?: PlanId;
  label?: string;
  className?: string;
  variant?: "primary" | "secondary";
};

export function CheckoutButton({
  stripeConfigured,
  plan = "brief",
  label,
  className,
  variant = "primary",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base =
    variant === "primary"
      ? "inline-flex items-center justify-center rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      : "inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60";

  const defaultLabel =
    plan === "studio" ? "Subscribe — $149/mo" : "Subscribe — $49/mo";

  if (!stripeConfigured) {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          disabled
          className={className ?? base}
          title={
            plan === "studio"
              ? "Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID_STUDIO — see GO-LIVE.md"
              : "Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID — see GO-LIVE.md"
          }
        >
          {label ?? "Configure Stripe"}
        </button>
        <p className="text-xs text-zinc-500">
          Demo mode — billing inactive until Stripe env vars are set (
          <code className="rounded bg-zinc-100 px-1">GO-LIVE.md</code>).
        </p>
      </div>
    );
  }

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Checkout failed");
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className={className ?? base}
      >
        {loading ? "Redirecting…" : label ?? defaultLabel}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
