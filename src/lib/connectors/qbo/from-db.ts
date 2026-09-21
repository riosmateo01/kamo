import type {
  DateRange,
  QboConnector,
  QboCustomer,
  QboJob,
  QboRevenueLine,
} from "@/lib/contracts/types";
import { getDb } from "@/db/client";
import {
  qboRawCustomers,
  qboRawJobs,
  qboRawRevenueLines,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrgIdOrNull, requireOrgId } from "@/lib/auth/org-context";

function inRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

export function createQboFromDb(organizationId?: string): QboConnector {
  const resolveOrg = () => organizationId ?? getOrgIdOrNull() ?? requireOrgId();

  return {
    async listCustomers(): Promise<QboCustomer[]> {
      const db = getDb();
      if (!db) return [];
      const orgId = resolveOrg();
      const rows = await db
        .select()
        .from(qboRawCustomers)
        .where(eq(qboRawCustomers.organizationId, orgId));
      return rows.map((r) => r.payload as QboCustomer);
    },
    async listJobs(): Promise<QboJob[]> {
      const db = getDb();
      if (!db) return [];
      const orgId = resolveOrg();
      const rows = await db
        .select()
        .from(qboRawJobs)
        .where(eq(qboRawJobs.organizationId, orgId));
      return rows.map((r) => r.payload as QboJob);
    },
    async listRevenue(range: DateRange): Promise<QboRevenueLine[]> {
      const db = getDb();
      if (!db) return [];
      const orgId = resolveOrg();
      const rows = await db
        .select()
        .from(qboRawRevenueLines)
        .where(eq(qboRawRevenueLines.organizationId, orgId));
      return rows
        .map((r) => r.payload as QboRevenueLine)
        .filter((e) => inRange(e.date, range));
    },
  };
}
