import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help",
  description:
    "How to use Kamo: a 10-minute Monday ritual with QuickBooks Online and Harvest.",
};

export default function HelpPage() {
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
              className="rounded-md px-2.5 py-1 text-xs font-semibold text-zinc-900"
              aria-current="page"
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

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Help
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Your 10-minute Monday ritual
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-600">
          Kamo turns QuickBooks Online revenue and Harvest labor into one client/project
          profit brief. Use this guide the first time — and every Monday after.
        </p>

        <ol className="mt-14 space-y-10">
          {[
            {
              n: "1",
              t: "Open the brief",
              d: (
                <>
                  Go to{" "}
                  <Link href="/brief" className="font-medium text-zinc-900 underline underline-offset-2">
                    /brief
                  </Link>
                  . Fixture demo data works with no credentials so you can see the shape
                  before connecting.
                </>
              ),
            },
            {
              n: "2",
              t: "Connect Harvest + QuickBooks Online",
              d: (
                <>
                  Open{" "}
                  <Link
                    href="/settings/connections"
                    className="font-medium text-zinc-900 underline underline-offset-2"
                  >
                    Connections
                  </Link>
                  . OAuth each app once. Connect-only — Kamo does not replace your time
                  tracker or books.
                </>
              ),
            },
            {
              n: "3",
              t: "Sync",
              d: "Hit Sync now. Kamo pulls clients, projects, approved time, and invoice revenue into your stack.",
            },
            {
              n: "4",
              t: "Set the period to Last week",
              d: "Use the period picker on the brief. Last week is the prior Monday–Sunday calendar week — the default Monday view.",
            },
            {
              n: "5",
              t: "Read the brief",
              d: "Start with the summary, then winners, losers, and anything that needs review. That queue is unmapped clients/projects — map them so labor and revenue land on the same job.",
            },
            {
              n: "6",
              t: "Optional: canned prompts",
              d: (
                <>
                  On{" "}
                  <Link href="/prompts" className="font-medium text-zinc-900 underline underline-offset-2">
                    /prompts
                  </Link>
                  , run a few fixed questions against the same reconciled numbers — not an
                  open chat.
                </>
              ),
            },
          ].map((step) => (
            <li key={step.n} className="flex gap-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                {step.n}
              </span>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">{step.t}</h2>
                <p className="mt-1.5 max-w-xl text-base leading-relaxed text-zinc-600">
                  {step.d}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-16 border-t border-zinc-100 pt-12">
          <h2 className="text-xl font-semibold tracking-tight">What Kamo is not</h2>
          <ul className="mt-4 max-w-xl space-y-2 text-base leading-relaxed text-zinc-600">
            <li>Not open GenBI chat or an AI ask-anything box</li>
            <li>Not a PSA — no time UI, scheduling, or invoicing</li>
            <li>Not a multi-system GenBI warehouse — connect-only QBO + Harvest</li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">
            If the numbers look wrong
          </h2>
          <ul className="mt-4 max-w-xl space-y-3 text-base leading-relaxed text-zinc-600">
            <li>
              <span className="font-medium text-zinc-800">Mapping.</span> Check Needs
              review and{" "}
              <Link
                href="/settings/mapping"
                className="font-medium text-zinc-900 underline underline-offset-2"
              >
                Mapping
              </Link>
              . Unmatched Harvest projects or QBO customers skew winners and losers until
              they are linked.
            </li>
            <li>
              <span className="font-medium text-zinc-800">Cost rates.</span> Labor cost
              comes from Harvest hours × cost rate. If rates are missing or stale in
              Harvest, contribution will be off — fix rates there, then sync again.
            </li>
            <li>
              <span className="font-medium text-zinc-800">Period.</span> Confirm Last week
              vs MTD vs custom. Fixture demos use a fixed sandbox week; live sync uses
              your calendar.
            </li>
          </ul>
        </section>

        <section className="mt-12 border-t border-zinc-100 pt-12">
          <h2 className="text-xl font-semibold tracking-tight">
            Where Kamo is going
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-600">
            The Monday profit brief stays the ritual: connect QuickBooks Online and
            Harvest, reconcile client/project P&amp;L, read winners and losers, act —
            including $49/mo and a design-partner free path.
          </p>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-zinc-600">
            Beyond that, Kamo builds private loops on systems you already run — recon
            into a trusted working object that triggers action. Next up: margin-risk
            exceptions to Slack. Not an open GenBI chat.
          </p>
        </section>

        <div className="mt-14 flex flex-wrap gap-3">
          <Link
            href="/brief"
            className="inline-flex rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Open brief
          </Link>
          <Link
            href="/"
            className="inline-flex rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Back to home
          </Link>
        </div>
      </main>

      <footer className="border-t border-zinc-100">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-medium text-zinc-700">Kamo</span>
            <span className="text-zinc-300"> · </span>
            Help
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <Link href="/" className="hover:text-zinc-800">
              Home
            </Link>
            <Link href="/brief" className="hover:text-zinc-800">
              Brief
            </Link>
            <Link href="/settings/connections" className="hover:text-zinc-800">
              Connections
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
