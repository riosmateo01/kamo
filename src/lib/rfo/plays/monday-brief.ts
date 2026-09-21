/**
 * Fabrication play #1 — Monday Brief view-model from monday_pnl fabric.
 * Reuses existing reconciler via harvest-qbo adapter / loadBrief.
 */

import { deriveBriefViews } from "@/lib/brief/views";
import type { BriefPayload } from "@/lib/brief/loadBrief";
import { harvestQboAdapter } from "../adapters/harvest-qbo";
import { createFabricObject } from "../fabric";
import type {
  FabricObject,
  MondayPnLPayload,
  ReconAdapterOptions,
  ReconResult,
} from "../types";

export const MONDAY_BRIEF_PLAY_ID = "monday_brief" as const;

export type MondayBriefFabrication = {
  recon: ReconResult;
  fabric: FabricObject[];
  view: BriefPayload;
};

/**
 * Run recon → ensure monday_pnl fabric → return brief view-model.
 */
export async function fabricateMondayBrief(
  opts?: ReconAdapterOptions
): Promise<MondayBriefFabrication> {
  const recon = await harvestQboAdapter.recon(opts);
  const pnlObj = recon.objects.find((o) => o.kind === "monday_pnl");
  if (!pnlObj) {
    throw new Error("harvest_qbo recon did not emit monday_pnl");
  }

  const payload = pnlObj.payload as unknown as MondayPnLPayload;
  const view: BriefPayload = { pnl: payload.pnl, meta: payload.meta };

  const views = deriveBriefViews(payload.pnl);
  // Tag play on a thin companion fabric row (same data; play provenance)
  const playTagged = await createFabricObject({
    kind: "monday_pnl",
    title: `Brief play · ${payload.meta.periodPresetLabel}`,
    sourceAdapterId: pnlObj.sourceAdapterId,
    playId: MONDAY_BRIEF_PLAY_ID,
    payload: {
      ...pnlObj.payload,
      viewsSummary: {
        winners: views.winners.length,
        losers: views.losers.length,
        watchlist: views.watchlist.length,
      },
    },
  });

  return {
    recon,
    fabric: [pnlObj, playTagged],
    view,
  };
}
