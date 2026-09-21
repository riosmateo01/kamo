"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

export function AuthNav() {
  return (
    <>
      <span
        className="mx-1 hidden h-4 w-px bg-zinc-200 sm:inline"
        aria-hidden
      />
      <OrganizationSwitcher
        hidePersonal
        afterCreateOrganizationUrl="/brief"
        afterSelectOrganizationUrl="/brief"
        appearance={{
          elements: {
            rootBox: "flex items-center",
            organizationSwitcherTrigger:
              "rounded-md px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100",
          },
        }}
      />
      <UserButton />
    </>
  );
}
