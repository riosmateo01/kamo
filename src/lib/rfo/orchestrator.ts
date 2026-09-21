/**
 * Orchestrator — Slack webhook / email (Resend or mailto via fetch) / dry-run no-op.
 */

import type {
  FabricObject,
  NotifyChannel,
  Orchestrator,
  TriggerResult,
} from "./types";

export function isSlackConfigured(): boolean {
  return Boolean(process.env.SLACK_WEBHOOK_URL?.trim());
}

export function isEmailNotifyConfigured(): boolean {
  return Boolean(process.env.NOTIFY_EMAIL?.trim());
}

export function getNotifyEnvStatus(): {
  slack: "set" | "unset";
  email: "set" | "unset";
  fromEmail: "set" | "unset";
  threshold: number;
} {
  return {
    slack: isSlackConfigured() ? "set" : "unset",
    email: isEmailNotifyConfigured() ? "set" : "unset",
    fromEmail: process.env.RFO_FROM_EMAIL?.trim() ? "set" : "unset",
    threshold: getMarginRiskThreshold(),
  };
}

export function getMarginRiskThreshold(): number {
  const raw = process.env.MARGIN_RISK_THRESHOLD?.trim();
  if (!raw) return 0.2;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return 0.2;
  return n;
}

/** Slack/email body — readable evidence, not a JSON dump. Soft-cap for webhook size. */
const SLACK_TEXT_SOFT_MAX = 2800;

function truncateLines(lines: string[], maxChars: number): string {
  let out = "";
  for (const line of lines) {
    const next = out ? `${out}\n${line}` : line;
    if (next.length > maxChars) {
      return `${out}\n…(truncated for length)`;
    }
    out = next;
  }
  return out;
}

/** Exported for unit tests — formats fabric object for Slack/email. */
export function formatObjectMessage(object: FabricObject): {
  text: string;
  subject: string;
} {
  const subject = `[Kamo] ${object.title}`;
  const lines = [
    object.title,
    `Kind: ${object.kind}`,
    `Id: ${object.id}`,
    `Status: ${object.status}`,
    `Created: ${object.createdAt}`,
  ];
  if (object.kind === "margin_risk_exception") {
    const p = object.payload as {
      name?: string;
      reasons?: string[];
      grossMargin?: number;
      revenue?: number;
      laborCost?: number;
      threshold?: number;
      evidence?: {
        answer?: string;
        calculation?: string;
        records?: Array<{ label: string; value: string }>;
        gaps?: string[];
      };
    };

    if (p.evidence?.answer) {
      lines.push("", "Answer", p.evidence.answer);
    } else {
      lines.push(
        `Entity: ${p.name ?? "—"}`,
        `Reasons: ${(p.reasons ?? []).join(", ") || "—"}`
      );
    }

    if (p.evidence?.calculation) {
      lines.push("", "Calculation", p.evidence.calculation);
    } else {
      lines.push(
        `Margin: ${p.grossMargin != null ? (p.grossMargin * 100).toFixed(1) + "%" : "—"} (threshold ${(p.threshold ?? 0.2) * 100}%)`,
        `Revenue: $${Number(p.revenue ?? 0).toFixed(2)} · Labor: $${Number(p.laborCost ?? 0).toFixed(2)}`
      );
    }

    if (p.evidence?.records?.length) {
      lines.push("", "Records");
      for (const r of p.evidence.records) {
        lines.push(`• ${r.label}: ${r.value}`);
      }
    }

    if (p.evidence?.gaps?.length) {
      lines.push("", "Gaps / needs review");
      for (const g of p.evidence.gaps) {
        lines.push(`• ${g}`);
      }
    } else if (p.evidence) {
      lines.push("", "Gaps / needs review", "• None flagged for this entity");
    }
  }
  return { subject, text: truncateLines(lines, SLACK_TEXT_SOFT_MAX) };
}

async function sendSlack(
  object: FabricObject
): Promise<{ ok: boolean; detail: string }> {
  const url = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!url) return { ok: false, detail: "SLACK_WEBHOOK_URL unset" };
  const { text } = formatObjectMessage(object);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `*Kamo RFO*\n\`\`\`\n${text}\n\`\`\``,
    }),
  });
  const body = await res.text().catch(() => "");
  return {
    ok: res.ok,
    detail: res.ok ? "slack webhook accepted" : `slack ${res.status}: ${body.slice(0, 200)}`,
  };
}

async function sendEmail(
  object: FabricObject
): Promise<{ ok: boolean; detail: string }> {
  const to = process.env.NOTIFY_EMAIL?.trim();
  if (!to) return { ok: false, detail: "NOTIFY_EMAIL unset" };
  const { subject, text } = formatObjectMessage(object);
  const from =
    process.env.RFO_FROM_EMAIL?.trim() || "kamo@localhost";
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    const body = await res.text().catch(() => "");
    return {
      ok: res.ok,
      detail: res.ok
        ? "resend accepted"
        : `resend ${res.status}: ${body.slice(0, 200)}`,
    };
  }

  // No Resend — document as dry-ish skip with clear message (no nodemailer dep)
  return {
    ok: false,
    detail:
      "NOTIFY_EMAIL set but RESEND_API_KEY unset — email not sent (configure Resend or use Slack)",
  };
}

export const orchestrator: Orchestrator = {
  async trigger(object, opts): Promise<TriggerResult> {
    const dryRun = Boolean(opts.dryRun);
    const channel = opts.channel;

    if (dryRun || channel === "none") {
      return {
        ok: true,
        channel: dryRun ? "dry_run" : "none",
        dryRun: true,
        message: dryRun
          ? `Dry-run: would notify via ${channel === "none" ? "none" : channel}`
          : "Notify channel none — no action",
        detail: object.id,
        fabricObjectId: object.id,
      };
    }

    if (channel === "slack") {
      if (!isSlackConfigured()) {
        return {
          ok: true,
          channel: "dry_run",
          dryRun: true,
          message: "SLACK_WEBHOOK_URL unset — dry-run no-op",
          fabricObjectId: object.id,
        };
      }
      try {
        const r = await sendSlack(object);
        return {
          ok: r.ok,
          channel: "slack",
          dryRun: false,
          message: r.ok ? "Sent to Slack" : "Slack send failed",
          detail: r.detail,
          fabricObjectId: object.id,
        };
      } catch (e) {
        return {
          ok: false,
          channel: "slack",
          dryRun: false,
          message: "Slack send error",
          detail: e instanceof Error ? e.message : String(e),
          fabricObjectId: object.id,
        };
      }
    }

    if (channel === "email") {
      if (!isEmailNotifyConfigured()) {
        return {
          ok: true,
          channel: "dry_run",
          dryRun: true,
          message: "NOTIFY_EMAIL unset — dry-run no-op",
          fabricObjectId: object.id,
        };
      }
      try {
        const r = await sendEmail(object);
        return {
          ok: r.ok,
          channel: "email",
          dryRun: false,
          message: r.ok ? "Sent email" : "Email not sent",
          detail: r.detail,
          fabricObjectId: object.id,
        };
      } catch (e) {
        return {
          ok: false,
          channel: "email",
          dryRun: false,
          message: "Email send error",
          detail: e instanceof Error ? e.message : String(e),
          fabricObjectId: object.id,
        };
      }
    }

    return {
      ok: true,
      channel: "dry_run",
      dryRun: true,
      message: "Unknown channel — dry-run",
      fabricObjectId: object.id,
    };
  },
};

/** Trigger many objects sequentially. */
export async function triggerAll(
  objects: FabricObject[],
  opts: { channel: NotifyChannel; dryRun?: boolean }
): Promise<TriggerResult[]> {
  const out: TriggerResult[] = [];
  for (const o of objects) {
    out.push(await orchestrator.trigger(o, opts));
  }
  return out;
}
