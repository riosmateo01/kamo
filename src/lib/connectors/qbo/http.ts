/**
 * Live QuickBooks Online Accounting API v3 connector (sandbox-friendly).
 *
 * Revenue approach (documented in SPIKE-2.md):
 *   Use Invoice.TotalAmt by TxnDate — not Payments.
 *   Each invoice → one QboRevenueLine attributed to CustomerRef
 *   (job if Job=true, else parent customer).
 */

import type {
  DateRange,
  QboConnector,
  QboCustomer,
  QboJob,
  QboRevenueLine,
} from "@/lib/contracts/types";
import { fetchJson } from "@/lib/http/fetch-json";
import { qboEnvironment } from "@/lib/auth/oauth-config";

export type QboHttpConfig = {
  accessToken: string;
  realmId: string;
  /** Override environment; defaults to QBO_ENVIRONMENT */
  environment?: "sandbox" | "production";
  /** QBO minorversion query param (default 65) */
  minorVersion?: number;
};

type QboCustomerRaw = {
  Id: string;
  DisplayName: string;
  FullyQualifiedName?: string;
  Job?: boolean;
  ParentRef?: { value: string; name?: string };
  Active?: boolean;
};

type QboInvoiceRaw = {
  Id: string;
  TxnDate: string;
  TotalAmt: number;
  DocNumber?: string;
  PrivateNote?: string;
  CustomerMemo?: { value?: string };
  CustomerRef?: { value: string; name?: string };
};

function baseUrl(env: "sandbox" | "production"): string {
  return env === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

function headers(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };
}

async function queryAll<T>(
  cfg: QboHttpConfig,
  entity: string,
  whereClause?: string
): Promise<T[]> {
  const env = cfg.environment ?? qboEnvironment();
  const minor = cfg.minorVersion ?? 65;
  const out: T[] = [];
  let start = 1;
  const pageSize = 1000;

  for (let i = 0; i < 50; i++) {
    const where = whereClause ? ` WHERE ${whereClause}` : "";
    const q = `SELECT * FROM ${entity}${where} STARTPOSITION ${start} MAXRESULTS ${pageSize}`;
    const url = `${baseUrl(env)}/v3/company/${encodeURIComponent(
      cfg.realmId
    )}/query?query=${encodeURIComponent(q)}&minorversion=${minor}`;

    const data = await fetchJson<{
      QueryResponse?: Record<string, T[] | number | undefined>;
    }>(url, { headers: headers(cfg.accessToken) });

    const qr = data.QueryResponse ?? {};
    const batch = (qr[entity] as T[] | undefined) ?? [];
    out.push(...batch);
    if (batch.length < pageSize) break;
    start += pageSize;
  }
  return out;
}

export function mapQboCustomer(raw: QboCustomerRaw): QboCustomer {
  return { id: String(raw.Id), displayName: raw.DisplayName };
}

export function mapQboJob(raw: QboCustomerRaw): QboJob {
  return {
    id: String(raw.Id),
    customerId: String(raw.ParentRef?.value ?? raw.Id),
    displayName: raw.DisplayName,
    fullyQualifiedName: raw.FullyQualifiedName,
  };
}

/**
 * Map an invoice to a revenue line.
 * Job customers (Job=true) → jobId = CustomerRef, customerId = ParentRef.
 * Parent customers → both ids = CustomerRef (customer-level revenue).
 */
export function mapInvoiceToRevenue(
  inv: QboInvoiceRaw,
  jobIds: Set<string>,
  parentByJob: Map<string, string>
): QboRevenueLine | null {
  const ref = inv.CustomerRef?.value;
  if (!ref) return null;
  const amount = Number(inv.TotalAmt);
  if (!Number.isFinite(amount)) return null;

  const isJob = jobIds.has(ref);
  const jobId = ref;
  const customerId = isJob ? parentByJob.get(ref) ?? ref : ref;

  return {
    id: `inv_${inv.Id}`,
    jobId,
    customerId,
    date: inv.TxnDate,
    amount,
    memo:
      inv.CustomerMemo?.value ||
      inv.PrivateNote ||
      (inv.DocNumber ? `Invoice ${inv.DocNumber}` : undefined),
  };
}

export function createQboHttp(cfg: QboHttpConfig): QboConnector {
  if (!cfg.accessToken) throw new Error("QBO access token required");
  if (!cfg.realmId) throw new Error("QBO realmId required");

  let cachedCustomers: QboCustomerRaw[] | null = null;
  let loading: Promise<QboCustomerRaw[]> | null = null;

  async function loadCustomers(): Promise<QboCustomerRaw[]> {
    if (cachedCustomers) return cachedCustomers;
    if (!loading) {
      loading = queryAll<QboCustomerRaw>(cfg, "Customer").then((rows) => {
        cachedCustomers = rows;
        return rows;
      });
    }
    return loading;
  }

  return {
    async listCustomers(): Promise<QboCustomer[]> {
      const all = await loadCustomers();
      return all
        .filter((c) => !c.Job)
        .map(mapQboCustomer);
    },
    async listJobs(): Promise<QboJob[]> {
      const all = await loadCustomers();
      return all.filter((c) => Boolean(c.Job)).map(mapQboJob);
    },
    async listRevenue(range: DateRange): Promise<QboRevenueLine[]> {
      const all = await loadCustomers();
      const jobs = all.filter((c) => Boolean(c.Job));
      const jobIds = new Set(jobs.map((j) => String(j.Id)));
      const parentByJob = new Map(
        jobs.map((j) => [
          String(j.Id),
          String(j.ParentRef?.value ?? j.Id),
        ])
      );

      // QBO query date filter — TxnDate is date-only
      const invoices = await queryAll<QboInvoiceRaw>(
        cfg,
        "Invoice",
        `TxnDate >= '${range.start}' AND TxnDate <= '${range.end}'`
      );

      return invoices
        .map((inv) => mapInvoiceToRevenue(inv, jobIds, parentByJob))
        .filter((r): r is QboRevenueLine => r != null);
    },
  };
}

export function qboApiBaseUrl(
  environment?: "sandbox" | "production"
): string {
  return baseUrl(environment ?? qboEnvironment());
}
