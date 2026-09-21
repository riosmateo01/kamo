import type { ReactNode } from "react";
import { AppHeader, type AppHeaderProps } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";

type AppShellProps = AppHeaderProps & {
  children: ReactNode;
  /** Wider padding / spacing for dense tables */
  dense?: boolean;
};

export function AppShell({ children, dense, ...header }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
      <AppHeader {...header} />
      <main
        className={`mx-auto w-full max-w-6xl flex-1 px-4 ${
          dense ? "space-y-5 py-5" : "space-y-6 py-6"
        }`}
      >
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
