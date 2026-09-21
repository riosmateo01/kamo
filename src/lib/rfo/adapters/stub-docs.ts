/**
 * Spike 2 stub — documents / non-finance adapter interface.
 * Returns an empty gap report so the registry proves pluggability.
 * No full docs product in Spike 1.
 */

import { createFabricObject } from "../fabric";
import type { ReconAdapter, ReconResult } from "../types";

export const STUB_DOCS_ADAPTER_ID = "stub_docs";

export const stubDocsAdapter: ReconAdapter = {
  id: STUB_DOCS_ADAPTER_ID,
  label: "Documents (Spike 2 stub)",

  async recon(): Promise<ReconResult> {
    const obj = await createFabricObject({
      kind: "docs_gap_report",
      title: "Documents gap report (stub)",
      sourceAdapterId: STUB_DOCS_ADAPTER_ID,
      status: "draft",
      payload: {
        connected: [],
        manual: [],
        missing: [
          "Document upload not wired in Spike 1",
          "DB / warehouse slice deferred to Spike 2",
        ],
        summary:
          "Stub adapter — proves RFO registry accepts non-finance intake. No documents processed.",
      },
    });

    return {
      adapterId: STUB_DOCS_ADAPTER_ID,
      objects: [obj],
      notes: [
        "Spike 2 stub only — empty gap report",
        "Wire real docs/DB adapter without changing orchestrator",
      ],
    };
  },
};
