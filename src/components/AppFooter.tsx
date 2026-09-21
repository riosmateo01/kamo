import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200/80 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-medium text-zinc-600">Kamo</span>
          <span className="text-zinc-300"> · </span>
          Agency P&amp;L · QBO + Harvest
        </p>
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          <Link
            href="/"
            className="hover:text-zinc-800 hover:underline underline-offset-2"
          >
            Home
          </Link>
          <Link
            href="/#pricing"
            className="hover:text-zinc-800 hover:underline underline-offset-2"
          >
            Pricing
          </Link>
          <Link
            href="/help"
            className="hover:text-zinc-800 hover:underline underline-offset-2"
          >
            Help
          </Link>
          <Link
            href="/brief"
            className="hover:text-zinc-800 hover:underline underline-offset-2"
          >
            Brief
          </Link>
          <Link
            href="/rfo"
            className="hover:text-zinc-800 hover:underline underline-offset-2"
          >
            RFO
          </Link>
          <Link
            href="/settings/connections"
            className="hover:text-zinc-800 hover:underline underline-offset-2"
          >
            Connections
          </Link>
          <Link
            href="/settings/mapping"
            className="hover:text-zinc-800 hover:underline underline-offset-2"
          >
            Mapping
          </Link>
        </p>
      </div>
    </footer>
  );
}
