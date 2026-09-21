import Link from "next/link";
import type { Metadata } from "next";
import { PLAN_NAME, PLAN_PRICE_USD } from "@/lib/billing/pricing";

export const metadata: Metadata = {
  title: "Subscription started",
};

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const sessionId = Array.isArray(sp.session_id)
    ? sp.session_id[0]
    : sp.session_id;

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
          Checkout complete
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Welcome to {PLAN_NAME}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Your ${PLAN_PRICE_USD}/mo subscription is starting. Stripe will confirm
          via webhook — then open the brief and connect QBO + Harvest.
        </p>
        {sessionId ? (
          <p className="mt-2 break-all text-[11px] text-zinc-400">
            Session {sessionId}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/brief"
            className="inline-flex rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Open the brief
          </Link>
          <Link
            href="/settings/connections"
            className="inline-flex rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Connect QBO + Harvest
          </Link>
        </div>
      </main>
    </div>
  );
}
