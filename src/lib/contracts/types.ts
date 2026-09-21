/** Spike 0 module contracts — implement against fixtures; swap mocks for real OAuth in Spike 1. */

export type IsoDate = string; // YYYY-MM-DD

export interface DateRange {
  start: IsoDate;
  end: IsoDate;
}

// —— Harvest connector ——
export interface HarvestClient {
  id: string;
  name: string;
}

export interface HarvestProject {
  id: string;
  clientId: string;
  name: string;
  code?: string | null;
}

export interface HarvestTimeEntry {
  id: string;
  projectId: string;
  userId: string;
  date: IsoDate;
  hours: number;
  billable: boolean;
  /** Agency cost rate for this entry; null → exclude from laborCost, count in missingCostRateHours */
  costRate: number | null;
}

export interface HarvestConnector {
  listClients(): Promise<HarvestClient[]>;
  listProjects(): Promise<HarvestProject[]>;
  listTimeEntries(range: DateRange): Promise<HarvestTimeEntry[]>;
}

// —— QBO connector ——
export interface QboCustomer {
  id: string;
  displayName: string;
}

export interface QboJob {
  id: string;
  customerId: string;
  displayName: string;
  fullyQualifiedName?: string;
}

export interface QboRevenueLine {
  id: string;
  jobId: string;
  customerId: string;
  date: IsoDate;
  amount: number;
  memo?: string;
}

export interface QboConnector {
  listCustomers(): Promise<QboCustomer[]>;
  listJobs(): Promise<QboJob[]>;
  listRevenue(range: DateRange): Promise<QboRevenueLine[]>;
}

// —— Mapping ——
export type MapStatus = "mapped" | "unmapped" | "needs_review";

export interface ClientMap {
  harvestClientId: string;
  qboCustomerId: string;
  status: "mapped";
}

export interface ProjectMap {
  harvestProjectId: string;
  qboJobId: string;
  status: "mapped";
}

export interface UnmatchedEntity {
  source: "harvest" | "qbo";
  entityType: "client" | "project" | "customer" | "job";
  id: string;
  reason: string;
}

export interface MappingSnapshot {
  clients: ClientMap[];
  projects: ProjectMap[];
  unmatched: UnmatchedEntity[];
}

export interface MappingService {
  /** Load explicit maps (fixture or DB). Unmapped harvest clients/projects → unmatched queue. */
  resolve(input: {
    harvestClients: HarvestClient[];
    harvestProjects: HarvestProject[];
    qboCustomers: QboCustomer[];
    qboJobs: QboJob[];
    clientMaps: ClientMap[];
    projectMaps: ProjectMap[];
  }): MappingSnapshot;
}

// —— P&L ——
export interface PeriodPnL {
  revenue: number;
  laborHours: number;
  laborCost: number;
  missingCostRateHours: number;
  grossProfit: number;
  grossMargin: number; // grossProfit / revenue; 0 if revenue === 0
}

export interface ProjectPnL extends PeriodPnL {
  harvestProjectId: string;
  qboJobId: string;
  name: string;
  prior: PeriodPnL & { revenueDelta: number; grossProfitDelta: number };
}

export interface ClientPnL extends PeriodPnL {
  harvestClientId: string;
  qboCustomerId: string;
  name: string;
  prior: PeriodPnL & { revenueDelta: number; grossProfitDelta: number };
}

export type NeedsReviewItem =
  | { entityType: "client"; harvestClientId: string; issue: "unmapped" }
  | {
      entityType: "project";
      harvestProjectId: string;
      issue: "unmapped";
      laborHoursInPeriod: number;
      laborCostIfMapped: number;
    }
  | {
      entityType: "time";
      timeEntryId: string;
      issue: "missing_cost_rate";
      hours: number;
      projectId: string;
    };

export interface ReconciledPnL {
  period: DateRange;
  priorPeriod: DateRange;
  projects: ProjectPnL[];
  clients: ClientPnL[];
  needsReview: NeedsReviewItem[];
}

export interface PnLReconciler {
  reconcile(input: {
    period: DateRange;
    priorPeriod: DateRange;
    timeEntries: HarvestTimeEntry[];
    revenueLines: QboRevenueLine[];
    mapping: MappingSnapshot;
    projects: HarvestProject[];
    clients: HarvestClient[];
  }): ReconciledPnL;
}

/** Compare actual vs expected; pass if every money field within ±absoluteUsd OR margin within relativeGpPct. */
export interface Tolerance {
  absoluteUsd: number; // e.g. 1
  relativeGpPct: number; // e.g. 0.001 = 0.1%
}

export interface ReconAssertionResult {
  ok: boolean;
  mismatches: Array<{ path: string; expected: number; actual: number; message: string }>;
}
