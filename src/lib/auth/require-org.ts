/**
 * Require authenticated Clerk user + active organization.
 * Mockable in unit tests via setRequireOrgMock / clearRequireOrgMock.
 */
import { NextResponse } from "next/server";
import type { OrgContext } from "./org-context";

export type RequireOrgResult = OrgContext;

type AuthFn = () => Promise<{
  userId: string | null;
  orgId: string | null;
}>;

let mockFn: (() => Promise<RequireOrgResult | NextResponse>) | null = null;
let authImpl: AuthFn | null = null;

/** Vitest helper — bypass live Clerk. */
export function setRequireOrgMock(
  fn: (() => Promise<RequireOrgResult | NextResponse>) | null
) {
  mockFn = fn;
}

export function clearRequireOrgMock() {
  mockFn = null;
}

/** Optional override of auth() for tests without full Clerk mock. */
export function setAuthImpl(fn: AuthFn | null) {
  authImpl = fn;
}

async function readAuth(): Promise<{ userId: string | null; orgId: string | null }> {
  if (authImpl) return authImpl();
  const { auth } = await import("@clerk/nextjs/server");
  const a = await auth();
  return {
    userId: a.userId ?? null,
    orgId: a.orgId ?? null,
  };
}

/**
 * Returns { orgId, userId } or a NextResponse (401/403) for API routes.
 */
export async function requireOrg(): Promise<
  RequireOrgResult | NextResponse
> {
  if (mockFn) return mockFn();

  const { userId, orgId } = await readAuth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthenticated" },
      { status: 401 }
    );
  }
  if (!orgId) {
    return NextResponse.json(
      {
        error: "Organization required. Create or select a Clerk organization.",
        code: "org_required",
      },
      { status: 403 }
    );
  }
  return { orgId, userId };
}

export function isOrgResult(
  v: RequireOrgResult | NextResponse
): v is RequireOrgResult {
  return !(v instanceof NextResponse) && "orgId" in v && "userId" in v;
}

/**
 * For Server Components / pages — throws redirect-friendly errors or returns ctx.
 * Returns null when Clerk keys unset in local fixture mode (optional soft path).
 */
export async function requireOrgOrThrow(): Promise<RequireOrgResult> {
  if (mockFn) {
    const r = await mockFn();
    if (!isOrgResult(r)) {
      const err = new Error("Unauthorized");
      (err as Error & { status: number }).status = r.status;
      throw err;
    }
    return r;
  }
  const { userId, orgId } = await readAuth();
  if (!userId) {
    const err = new Error("Unauthorized");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  if (!orgId) {
    const err = new Error("Organization required");
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  return { orgId, userId };
}
