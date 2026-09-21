/**
 * Spike 1 R→F→O skeleton types.
 * Recon adapter → fabric object → orchestrator.
 */

import type { BriefPayload } from "@/lib/brief/loadBrief";
import type { ReconciledPnL } from "@/lib/contracts/types";

/** Kind of trusted working object stored on the fabric. */
export type FabricKind =
  | "monday_pnl"
  | "margin_risk_exception"
  | "docs_gap_report";

export type FabricObjectStatus = "draft" | "trusted" | "actioned" | "archived";

export type FabricObject = {
  id: string;
  kind: FabricKind;
  /** Human label for UI / notifications */
  title: string;
  status: FabricObjectStatus;
  /** ISO timestamp */
  createdAt: string;
  /** Source adapter id that produced this object (or play that fabricated it) */
  sourceAdapterId?: string;
  /** Play that fabricated this object */
  playId?: string;
  /** Arbitrary trusted payload — P&L brief, exception detail, gap report, etc. */
  payload: Record<string, unknown>;
};

export type ReconResult = {
  adapterId: string;
  /** Primary fabric object(s) produced by recon */
  objects: FabricObject[];
  /** Optional gap / inventory notes for UI */
  notes?: string[];
};

/**
 * Pluggable intake. Spike 1: Harvest+QBO live; stub-docs for Spike 2 pluggability.
 */
export interface ReconAdapter {
  id: string;
  label: string;
  recon(opts?: ReconAdapterOptions): Promise<ReconResult>;
}

export type ReconAdapterOptions = {
  /** Period key / custom range — forwarded to loadBrief when relevant */
  period?: string;
  start?: string;
  end?: string;
};

export type NotifyChannel = "slack" | "email" | "none";

export type TriggerResult = {
  ok: boolean;
  channel: NotifyChannel | "dry_run";
  dryRun: boolean;
  /** Short human message */
  message: string;
  /** Optional provider response snippet */
  detail?: string;
  fabricObjectId: string;
};

export interface Orchestrator {
  /**
   * Fire a trigger for a fabric object.
   * When dryRun or channel unset/unavailable → no-op dry-run.
   */
  trigger(
    object: FabricObject,
    opts: { channel: NotifyChannel; dryRun?: boolean }
  ): Promise<TriggerResult>;
}

export type PlayId = "monday_brief" | "margin_risk";

export type PlayRunInput = {
  play: PlayId;
  dryRun?: boolean;
  notify?: NotifyChannel;
  period?: string;
  start?: string;
  end?: string;
  organizationId?: string;
};

export type PlayRunResult = {
  play: PlayId;
  recon: ReconResult;
  /** Fabric objects created/updated by fabrication */
  fabric: FabricObject[];
  /** Orchestration results (empty when notify=none or dry and no objects) */
  triggers: TriggerResult[];
  /** Play-specific view model (brief payload or exception summary) */
  view?: BriefPayload | MarginRiskView;
};

/** Kamino-style evidence pack on action-path exceptions (not open GenBI). */
export type ExceptionEvidence = {
  /** What's wrong / who */
  answer: string;
  /** Human-readable calculation (reuses reconciler fields) */
  calculation: string;
  /** Records used — ids, period, source systems */
  records: Array<{ label: string; value: string }>;
  /** Gaps / needs review tied to this entity (from reconciler needsReview) */
  gaps: string[];
};

export type MarginRiskExceptionPayload = {
  entityType: "project" | "client";
  entityId: string;
  name: string;
  revenue: number;
  laborCost: number;
  grossProfit: number;
  grossMargin: number;
  /** Why this fired */
  reasons: Array<"margin_below_threshold" | "over_serviced">;
  threshold: number;
  period: { start: string; end: string };
  /** Optional QBO counterpart id when known from reconciler row */
  qboId?: string;
  /** Structured evidence for UI + Slack */
  evidence: ExceptionEvidence;
};

export type MarginRiskView = {
  threshold: number;
  exceptionCount: number;
  exceptions: MarginRiskExceptionPayload[];
  source: BriefPayload["meta"]["source"];
  periodLabel: string;
  generatedAt: string;
};

/** Registry of recon adapters keyed by id. */
export type AdapterRegistry = Map<string, ReconAdapter>;

export type MondayPnLPayload = {
  pnl: ReconciledPnL;
  meta: BriefPayload["meta"];
};
