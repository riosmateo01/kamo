/**
 * Harvest + QBO recon adapter — wraps existing loadBrief / sync path.
 * Emits a monday_pnl fabric object; does not rewrite P&L math.
 */

import { loadBrief, type LoadBriefOptions } from "@/lib/brief/loadBrief";
import { parsePeriodKey } from "@/lib/brief/period";
import { createFabricObject } from "../fabric";
import type {
  MondayPnLPayload,
  ReconAdapter,
  ReconAdapterOptions,
  ReconResult,
} from "../types";

export const HARVEST_QBO_ADAPTER_ID = "harvest_qbo";

function toLoadOpts(opts?: ReconAdapterOptions): LoadBriefOptions {
  return {
    period: parsePeriodKey(opts?.period),
    start: opts?.start,
    end: opts?.end,
  };
}

export const harvestQboAdapter: ReconAdapter = {
  id: HARVEST_QBO_ADAPTER_ID,
  label: "Harvest + QuickBooks Online",

  async recon(opts?: ReconAdapterOptions): Promise<ReconResult> {
    const brief = await loadBrief(toLoadOpts(opts));
    const payload: MondayPnLPayload = {
      pnl: brief.pnl,
      meta: brief.meta,
    };
    const obj = await createFabricObject({
      kind: "monday_pnl",
      title: `Monday P&L · ${brief.meta.periodPresetLabel} · ${brief.meta.periodLabel}`,
      sourceAdapterId: HARVEST_QBO_ADAPTER_ID,
      payload: payload as unknown as Record<string, unknown>,
    });

    const notes: string[] = [
      `Source: ${brief.meta.source}${brief.meta.sourceDetail ? ` (${brief.meta.sourceDetail})` : ""}`,
      `Projects: ${brief.pnl.projects.length} · Clients: ${brief.pnl.clients.length}`,
      `Needs review: ${brief.pnl.needsReview.length}`,
    ];

    return {
      adapterId: HARVEST_QBO_ADAPTER_ID,
      objects: [obj],
      notes,
    };
  },
};
