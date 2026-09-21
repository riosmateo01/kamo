import type { ReactNode } from "react";
import Link from "next/link";
import type { BriefSource } from "@/lib/brief";
import { AuthNav } from "@/components/AuthNav";

export type AppHeaderProps = {
  /** Page heading under the product name */
  title: string;
  subtitle?: ReactNode;
  freshness?: ReactNode;
  source?: BriefSource;
  current: "brief" | "prompts" | "connections" | "mapping" | "help" | "rfo";
};

const sourceBadge: Record<
  BriefSource,
  { label: string; className: string }
> = {
  fixtures: {
    label: "FIXTURES",
    className:
      "bg-sky-100 text-sky-900 ring-1 ring-inset ring-sky-200",
  },
  live: {
    label: "LIVE",
    className:
      "bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-200",
  },
};

export function AppHeader({
  title,
  subtitle,
  freshness,
  source,
  current,
}: AppHeaderProps) {
  const badge = source ? sourceBadge[source] : null;

  const activeNav =
    current === "mapping" ? "connections" : current;

  const linkClass = (
    key: "brief" | "prompts" | "connections" | "help" | "rfo"
  ) =>
    key === activeNav
      ? "rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white"
      : "rounded-md px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900";

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <Link
            href="/"
            className="group flex items-baseline gap-2"
            aria-label="Kamo marketing home"
          >
            <span className="text-sm font-semibold tracking-tight text-zinc-900 group-hover:text-zinc-700">
              Kamo
            </span>
            <span className="hidden text-[11px] font-medium uppercase tracking-wider text-zinc-400 sm:inline">
              Profit
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1" aria-label="Product">
            <Link
              href="/brief"
              className={linkClass("brief")}
              aria-current={current === "brief" ? "page" : undefined}
            >
              Brief
            </Link>
            <Link
              href="/prompts"
              className={linkClass("prompts")}
              aria-current={current === "prompts" ? "page" : undefined}
            >
              Prompts
            </Link>
            <Link
              href="/rfo"
              className={linkClass("rfo")}
              aria-current={current === "rfo" ? "page" : undefined}
            >
              RFO
            </Link>
            <Link
              href="/settings/connections"
              className={linkClass("connections")}
              aria-current={activeNav === "connections" ? "page" : undefined}
            >
              Connections
            </Link>
            <Link
              href="/help"
              className={linkClass("help")}
              aria-current={current === "help" ? "page" : undefined}
            >
              Help
            </Link>
            <AuthNav />
          </nav>
        </div>

        <div className="border-t border-zinc-100 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
              {title}
            </h1>
            {badge ? (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${badge.className}`}
              >
                {badge.label}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <div className="mt-1.5 text-sm text-zinc-600">{subtitle}</div>
          ) : null}
          {freshness ? (
            <div className="mt-1 text-xs text-zinc-500">{freshness}</div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
