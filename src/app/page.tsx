import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import {
  PLAN_PRICE_USD,
  PLANS,
  STUDIO_PRICE_USD,
} from "@/lib/billing/pricing";
import {
  isPlanCheckoutReady,
  isStripeConfigured,
} from "@/lib/billing/stripe";

export const metadata: Metadata = {
  title: "Kamo — Know which clients made money every Monday",
  description:
    "Connect QuickBooks Online + Harvest in minutes. Get a Monday client/project profit brief. Kamo $49/mo · Kamo Studio $149/mo. Design partners welcome.",
};

const DESIGN_PARTNER_MAILTO =
  "mailto:riosmateo01@gmail.com?subject=Kamo%20design%20partner%20%E2%80%94%203%20free%20Monday%20briefs&body=Hi%20Mateo%2C%0A%0AI%27d%20like%20the%203%20free%20Monday%20briefs%20design-partner%20path.%0A%0AAgency%3A%20%0ABest%20time%20for%2020%20min%3A%20%0A";

function Section({
  id,
  children,
  className = "",
  wide = false,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <section
      id={id}
      className={`mx-auto w-full ${wide ? "max-w-5xl" : "max-w-3xl"} px-4 ${className}`}
    >
      {children}
    </section>
  );
}

export default function MarketingLandingPage() {
  const stripeReady = isStripeConfigured();
  const studioReady = isPlanCheckoutReady("studio");
  const brief = PLANS.brief;
  const studio = PLANS.studio;

  return (
    <div className="flex min-h-full flex-col bg-white text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <Link href="/" className="text-sm font-semibold tracking-tight" aria-label="Kamo home">
            Kamo
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Marketing">
            <Link
              href="/#how"
              className="hidden rounded-md px-2.5 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 sm:inline"
            >
              How it works
            </Link>
            <Link
              href="/#pricing"
              className="hidden rounded-md px-2.5 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 sm:inline"
            >
              Pricing
            </Link>
            <Link
              href="/help"
              className="hidden rounded-md px-2.5 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 sm:inline"
            >
              Help
            </Link>
            <Link
              href="/brief"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              Open brief
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <Section className="pb-16 pt-20 sm:pb-24 sm:pt-28">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl sm:leading-[1.1]">
            Know which clients made money — every Monday.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-600">
            Connect QuickBooks Online + Harvest in minutes. Kamo reconciles revenue and
            labor into one client/project profit brief.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            The company behind the Monday brief
          </p>
          <p className="mt-2 max-w-lg text-base leading-relaxed text-zinc-600">
            Kamo builds private loops on systems you already run — recon into a trusted
            working object, then that object triggers action. The Monday profit brief is
            play #1.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <CheckoutButton
              stripeConfigured={stripeReady}
              plan="brief"
              label={
                stripeReady
                  ? `Start $${PLAN_PRICE_USD}/mo`
                  : "Configure Stripe"
              }
            />
            <a
              href={DESIGN_PARTNER_MAILTO}
              className="inline-flex items-center justify-center rounded-md border border-zinc-900 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Get 3 free Monday briefs
            </a>
            <Link
              href="/brief"
              className="inline-flex rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Open brief
            </Link>
          </div>
          <p className="mt-5 text-sm text-zinc-500">
            Soft gate only — design partners stay free while we harden live sync.
          </p>
        </Section>

        {/* Contrast: QBO alone vs Kamo */}
        <div className="border-y border-zinc-100 bg-zinc-50 py-16 sm:py-20">
          <Section>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Example · illustrative numbers
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Same week. Two answers.
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  What QBO alone says
                </p>
                <p className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900">
                  42%
                </p>
                <p className="mt-2 text-sm text-zinc-600">
                  $21,000 profit on $50,000 revenue
                </p>
                <p className="mt-4 text-sm leading-relaxed text-zinc-500">
                  Invoices in, bills out. Labor cost is invisible — so the margin looks
                  healthy.
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-900 bg-zinc-900 p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  What Kamo shows after Harvest labor
                </p>
                <p className="mt-4 text-4xl font-semibold tracking-tight">14%</p>
                <p className="mt-2 text-sm text-zinc-300">
                  $7,000 profit on $50,000 revenue
                </p>
                <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                  Same revenue, plus approved hours costed from Harvest. The real
                  contribution after labor.
                </p>
              </div>
            </div>
            <p className="mt-6 text-sm text-zinc-500">
              Illustrative example only — not live data. Your brief uses your own QBO +
              Harvest numbers.
            </p>
          </Section>
        </div>

        {/* How it works — 3 steps */}
        <Section id="how" className="py-16 sm:py-24">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <ol className="mt-12 space-y-10">
            {[
              {
                n: "1",
                t: "Connect",
                d: "OAuth for QuickBooks Online and Harvest. No CSV uploads. No second time tracker.",
              },
              {
                n: "2",
                t: "Sync",
                d: "Pull clients, projects, time, and invoice revenue. Map names once; we flag what still needs a match.",
              },
              {
                n: "3",
                t: "Monday brief",
                d: "Open last week’s winners, losers, thin margins, and needs-review — ready when the week starts.",
              },
            ].map((step) => (
              <li key={step.n} className="flex gap-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                  {step.n}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">{step.t}</h3>
                  <p className="mt-1.5 max-w-md text-base leading-relaxed text-zinc-600">
                    {step.d}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* Anti-Kamino */}
        <Section className="pb-16 sm:pb-24">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Not another ask box
          </p>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-zinc-600">
            Kamino helps you ask about reconciled finance. Kamo wires the stack so recon
            becomes a trusted object that triggers action — Monday profit, then
            margin-risk → Slack.
          </p>
        </Section>

        {/* Design-partner strip — equal weight CTA above pricing */}
        <div className="border-y border-zinc-100 bg-white py-14 sm:py-16">
          <Section>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Get 3 free Monday briefs
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-600">
              Join as a design partner. ~20 minutes on how you see client profit today,
              connect QuickBooks Online + Harvest, and we’ll send three free Monday
              briefs. No install theater. Not a sales demo.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={DESIGN_PARTNER_MAILTO}
                className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Get 3 free Monday briefs
              </a>
              <CheckoutButton
                stripeConfigured={stripeReady}
                plan="brief"
                variant="secondary"
                label={
                  stripeReady
                    ? `Start $${PLAN_PRICE_USD}/mo`
                    : "Configure Stripe"
                }
              />
            </div>
            <p className="mt-5 text-sm text-zinc-500">
              Soft gate only — design partners stay free while we harden live sync.
            </p>
          </Section>
        </div>

        {/* Pricing — two tiers */}
        <div id="pricing" className="border-b border-zinc-100 bg-zinc-50 py-16 sm:py-24">
          <Section wide>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Pricing
            </h2>
            <p className="mt-3 max-w-xl text-base text-zinc-600">
              Two tiers. Start with Monday Brief, or Studio for Brief plus additional
              R→F→O rituals.
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {/* Kamo $49 */}
              <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {brief.name}
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-600">
                  {brief.subtitle}
                </p>
                <p className="mt-3 flex items-baseline gap-1">
                  <span className="text-5xl font-semibold tracking-tight">
                    ${brief.priceUsd}
                  </span>
                  <span className="text-base text-zinc-500">/ month</span>
                </p>
                <ul className="mt-8 space-y-3 text-sm text-zinc-700">
                  {brief.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <span className="mt-0.5 text-emerald-600" aria-hidden>
                        ✓
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                  <span className="font-medium text-zinc-800">Not included:</span>{" "}
                  {brief.notIncluded}
                </div>
                <div className="mt-8">
                  <CheckoutButton
                    stripeConfigured={stripeReady}
                    plan="brief"
                    label={
                      stripeReady
                        ? `Start $${brief.priceUsd}/mo`
                        : "Configure Stripe"
                    }
                  />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-zinc-500">
                  Design partners: free access while we ship live sync. Soft gate only —
                  local/dev never paywalls the brief.
                </p>
              </div>

              {/* Kamo Studio $149 */}
              <div className="flex flex-col rounded-2xl border border-zinc-900 bg-white p-8 shadow-sm ring-1 ring-zinc-900">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {studio.name}
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-600">
                  {studio.subtitle}
                </p>
                <p className="mt-3 flex items-baseline gap-1">
                  <span className="text-5xl font-semibold tracking-tight">
                    ${studio.priceUsd}
                  </span>
                  <span className="text-base text-zinc-500">/ month</span>
                </p>
                <ul className="mt-8 space-y-3 text-sm text-zinc-700">
                  {studio.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <span className="mt-0.5 text-emerald-600" aria-hidden>
                        ✓
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                  <span className="font-medium text-zinc-800">Not included:</span>{" "}
                  {studio.notIncluded}
                </div>
                <div className="mt-8">
                  <CheckoutButton
                    stripeConfigured={studioReady}
                    plan="studio"
                    label={
                      studioReady
                        ? `Start $${studio.priceUsd}/mo`
                        : "Configure Stripe"
                    }
                  />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-zinc-500">
                  More included after — second workflows, exception alerts, expanded
                  orchestration on the RFO skeleton.
                </p>
              </div>
            </div>
          </Section>
        </div>

        {/* Help teaser */}
        <Section className="py-16 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight">Need a walkthrough?</h2>
          <p className="mt-3 max-w-md text-base leading-relaxed text-zinc-600">
            A 10-minute Monday ritual: open the brief, connect, sync, read winners and
            losers, fix anything that needs review.
          </p>
          <Link
            href="/help"
            className="mt-6 inline-flex text-sm font-semibold text-zinc-900 underline underline-offset-4 hover:text-zinc-600"
          >
            Read the help guide →
          </Link>
        </Section>

        {/* Founder */}
        <Section className="pb-16 sm:pb-20">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Why Kamo exists
          </h2>
          <div className="mt-6 max-w-xl space-y-4 text-base leading-relaxed text-zinc-600">
            <p>
              I’m Mateo Rios. I kept watching creative and digital agencies find out
              which clients were profitable after the invoice — or after the damage.
              Spreadsheets, QBO, Harvest, and a principal’s gut aren’t a Monday ritual.
            </p>
            <p>
              Kamo isn’t another PSA. No new time UI, no scheduling, no invoicing.
              Connect what you already use, read the brief, act.
            </p>
            <p className="text-zinc-800">— Mateo</p>
          </div>
        </Section>
      </main>

      <footer className="border-t border-zinc-100">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-medium text-zinc-700">Kamo</span>
            <span className="text-zinc-300"> · </span>
            QBO + Harvest · ${PLAN_PRICE_USD}/mo · Studio ${STUDIO_PRICE_USD}/mo
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <Link href="/#how" className="hover:text-zinc-800">
              How it works
            </Link>
            <Link href="/#pricing" className="hover:text-zinc-800">
              Pricing
            </Link>
            <Link href="/help" className="hover:text-zinc-800">
              Help
            </Link>
            <Link href="/brief" className="hover:text-zinc-800">
              Brief
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
