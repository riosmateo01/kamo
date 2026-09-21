import { redirect } from "next/navigation";
import { requireOrgOrThrow } from "./require-org";
import { runWithOrgAsync, type OrgContext } from "./org-context";

/** Server Component helper: require Clerk org then run fn in org context. */
export async function withOrgPage<T>(
  fn: (ctx: OrgContext) => Promise<T>
): Promise<T> {
  try {
    const ctx = await requireOrgOrThrow();
    return await runWithOrgAsync(ctx, () => fn(ctx));
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 401) redirect("/sign-in");
    if (status === 403) redirect("/sign-in?redirect_url=/brief&org=required");
    throw err;
  }
}
