/**
 * Append-only audit events. No update/delete API.
 */
import { getDb } from "@/db/client";
import { auditEvents } from "@/db/schema";
import { newId } from "@/lib/sync/id";
import { getActorUserIdOrNull, getOrgIdOrNull } from "@/lib/auth/org-context";

export type AuditAction =
  | "oauth.connect"
  | "sync.enqueue"
  | "sync.run"
  | "checkout.create"
  | "webhook.subscription"
  | "seed.blocked"
  | "seed.run"
  | "rfo.notify"
  | "rfo.run"
  | "jobs.drain";

export async function appendAuditEvent(input: {
  organizationId?: string;
  actorUserId?: string | null;
  action: AuditAction | string;
  resource: string;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  const db = getDb();
  if (!db) return;

  const organizationId =
    input.organizationId ?? getOrgIdOrNull() ?? "unknown";
  const actorUserId =
    input.actorUserId !== undefined
      ? input.actorUserId
      : getActorUserIdOrNull();

  try {
    await db.insert(auditEvents).values({
      id: newId("aud"),
      organizationId,
      actorUserId: actorUserId ?? null,
      action: input.action,
      resource: input.resource,
      meta: input.meta ?? null,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("[audit] append failed", err);
  }
}
