/**
 * Request-scoped organization id via AsyncLocalStorage.
 * Set at API/page boundary after requireOrg(); DB helpers read getOrgId().
 */
import { AsyncLocalStorage } from "node:async_hooks";

export type OrgContext = {
  orgId: string;
  userId: string;
};

const storage = new AsyncLocalStorage<OrgContext>();

export function runWithOrg<T>(ctx: OrgContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export async function runWithOrgAsync<T>(
  ctx: OrgContext,
  fn: () => Promise<T>
): Promise<T> {
  return storage.run(ctx, fn);
}

export function getOrgContext(): OrgContext | null {
  return storage.getStore() ?? null;
}

/** Throws if no org in context (programmer error outside requireOrg boundary). */
export function requireOrgId(): string {
  const ctx = storage.getStore();
  if (!ctx?.orgId) {
    throw new Error("organization_id missing from request context");
  }
  return ctx.orgId;
}

export function getOrgIdOrNull(): string | null {
  return storage.getStore()?.orgId ?? null;
}

export function getActorUserIdOrNull(): string | null {
  return storage.getStore()?.userId ?? null;
}
