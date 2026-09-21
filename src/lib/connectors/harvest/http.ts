/**
 * Live Harvest API v2 connector.
 * Docs: https://help.getharvest.com/api-v2/
 *
 * Auth headers (every request):
 *   Authorization: Bearer <access_token>
 *   Harvest-Account-Id: <account_id>
 *   User-Agent: MondayProfitBrief (ops@example.com)
 */

import type {
  DateRange,
  HarvestClient,
  HarvestConnector,
  HarvestProject,
  HarvestTimeEntry,
} from "@/lib/contracts/types";
import { fetchJson } from "@/lib/http/fetch-json";

const API_BASE = "https://api.harvestapp.com/v2";
const ID_BASE = "https://id.getharvest.com/api/v2";
const DEFAULT_UA =
  process.env.HARVEST_USER_AGENT?.trim() ||
  "MondayProfitBrief (monday-brief@localhost)";

export type HarvestHttpConfig = {
  accessToken: string;
  accountId: string;
  userAgent?: string;
};

type HarvestListMeta = {
  page?: number;
  total_pages?: number;
  next_page?: number | null;
};

type RawClient = { id: number; name: string };
type RawProject = {
  id: number;
  name: string;
  code: string | null;
  client: { id: number; name: string };
};
type RawTimeEntry = {
  id: number;
  spent_date: string;
  hours: number;
  billable: boolean;
  cost_rate: number | null;
  user: { id: number; name: string };
  project: { id: number; name: string };
};

function headers(cfg: HarvestHttpConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${cfg.accessToken}`,
    "Harvest-Account-Id": cfg.accountId,
    "User-Agent": cfg.userAgent ?? DEFAULT_UA,
    Accept: "application/json",
  };
}

async function paginate<TItem, TKey extends string>(
  cfg: HarvestHttpConfig,
  path: string,
  key: TKey,
  query: Record<string, string> = {}
): Promise<TItem[]> {
  const out: TItem[] = [];
  let page = 1;
  // Hard cap pages to avoid runaway loops
  for (let i = 0; i < 100; i++) {
    const qs = new URLSearchParams({
      ...query,
      page: String(page),
      per_page: "100",
    });
    const url = `${API_BASE}${path}?${qs}`;
    const data = await fetchJson<Record<TKey, TItem[]> & HarvestListMeta>(
      url,
      { headers: headers(cfg) }
    );
    const batch = data[key] ?? [];
    out.push(...batch);
    if (!data.next_page || data.next_page === page) break;
    page = data.next_page;
  }
  return out;
}

export function mapHarvestClient(raw: RawClient): HarvestClient {
  return { id: String(raw.id), name: raw.name };
}

export function mapHarvestProject(raw: RawProject): HarvestProject {
  return {
    id: String(raw.id),
    clientId: String(raw.client.id),
    name: raw.name,
    code: raw.code,
  };
}

export function mapHarvestTimeEntry(
  raw: RawTimeEntry,
  userDefaultCostRates?: Map<string, number>
): HarvestTimeEntry {
  let costRate: number | null =
    raw.cost_rate == null || Number.isNaN(Number(raw.cost_rate))
      ? null
      : Number(raw.cost_rate);
  // Harvest often leaves time_entry.cost_rate null; fall back to user default.
  if (costRate == null && userDefaultCostRates) {
    const fallback = userDefaultCostRates.get(String(raw.user.id));
    if (fallback != null && !Number.isNaN(fallback)) costRate = fallback;
  }
  return {
    id: String(raw.id),
    projectId: String(raw.project.id),
    userId: String(raw.user.id),
    date: raw.spent_date,
    hours: Number(raw.hours) || 0,
    billable: Boolean(raw.billable),
    costRate,
  };
}

/** Resolve Harvest account id from OAuth token (id.getharvest.com accounts). */
export async function fetchHarvestAccountId(
  accessToken: string,
  userAgent?: string
): Promise<{ accountId: string; name: string } | null> {
  const data = await fetchJson<{
    accounts?: Array<{ id: number; name: string; product?: string }>;
  }>(`${ID_BASE}/accounts`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": userAgent ?? DEFAULT_UA,
      Accept: "application/json",
    },
  });
  const harvest = (data.accounts ?? []).filter(
    (a) => !a.product || a.product === "harvest"
  );
  const pick = harvest[0] ?? data.accounts?.[0];
  if (!pick) return null;
  return { accountId: String(pick.id), name: pick.name };
}

export function createHarvestHttp(cfg: HarvestHttpConfig): HarvestConnector {
  if (!cfg.accessToken) throw new Error("Harvest access token required");
  if (!cfg.accountId) throw new Error("Harvest account id required");

  return {
    async listClients(): Promise<HarvestClient[]> {
      const raw = await paginate<RawClient, "clients">(cfg, "/clients", "clients");
      return raw.map(mapHarvestClient);
    },
    async listProjects(): Promise<HarvestProject[]> {
      const raw = await paginate<RawProject, "projects">(
        cfg,
        "/projects",
        "projects"
      );
      return raw.map(mapHarvestProject);
    },
    async listTimeEntries(range: DateRange): Promise<HarvestTimeEntry[]> {
      type RawUser = { id: number; cost_rate?: number | null };
      const users = await paginate<RawUser, "users">(cfg, "/users", "users");
      const userDefaults = new Map<string, number>();
      for (const u of users) {
        if (u.cost_rate != null && !Number.isNaN(Number(u.cost_rate))) {
          userDefaults.set(String(u.id), Number(u.cost_rate));
        }
      }
      const raw = await paginate<RawTimeEntry, "time_entries">(
        cfg,
        "/time_entries",
        "time_entries",
        { from: range.start, to: range.end }
      );
      return raw.map((e) => mapHarvestTimeEntry(e, userDefaults));
    },
  };
}
