import Link from "next/link";
import type { Metadata } from "next";
import { PLAN_PRICE_USD } from "@/lib/billing/pricing";

export const metadata: Metadata = {
  title: "Checkout canceled",
};

export default function BillingCancelPage() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Checkout canceled
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          No charge — you can try again anytime
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          The brief stays open for design partners and local demos. Subscribe
          for ${PLAN_PRICE_USD}/mo when you are ready for production.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/#pricing"
            className="inline-flex rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Back to pricing
          </Link>
          <Link
            href="/brief"
            className="inline-flex rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Open the brief anyway
          </Link>
        </div>
      </main>
    </div>
  );
}
