/**
 * Run an RFO play: recon → fabric → optional orchestrate.
 */

import { fabricateMondayBrief } from "./plays/monday-brief";
import { fabricateMarginRisk } from "./plays/margin-risk";
import { triggerAll } from "./orchestrator";
import type { PlayRunInput, PlayRunResult } from "./types";

export async function runPlay(input: PlayRunInput): Promise<PlayRunResult> {
  const notify = input.notify ?? "none";
  const dryRun = Boolean(input.dryRun);
  const opts = {
    period: input.period,
    start: input.start,
    end: input.end,
  };

  if (input.play === "monday_brief") {
    const fab = await fabricateMondayBrief(opts);
    const toNotify =
      notify === "none"
        ? []
        : fab.fabric.filter((o) => o.kind === "monday_pnl").slice(0, 1);
    const triggers =
      toNotify.length > 0
        ? await triggerAll(toNotify, { channel: notify, dryRun })
        : [];
    return {
      play: "monday_brief",
      recon: fab.recon,
      fabric: fab.fabric,
      triggers,
      view: fab.view,
    };
  }

  if (input.play === "margin_risk") {
    const fab = await fabricateMarginRisk(opts);
    const exceptions = fab.fabric.filter(
      (o) => o.kind === "margin_risk_exception"
    );
    const triggers =
      notify === "none" || exceptions.length === 0
        ? []
        : await triggerAll(exceptions, { channel: notify, dryRun });

    return {
      play: "margin_risk",
      recon: fab.recon,
      fabric: fab.fabric,
      triggers,
      view: fab.view,
    };
  }

  throw new Error(`Unknown play: ${(input as PlayRunInput).play}`);
}
