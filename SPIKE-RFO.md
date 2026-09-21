# Spike 1 — R→F→O skeleton

Thin reusable **recon adapter → fabric object → orchestrator** that powers the live Monday Brief plus a second O-path (margin-risk → Slack/email). Docs/DB non-finance adapter is a **stub** for Spike 2.

See `PRODUCT-BET.md` for locked product wording.

## What shipped

| Layer | Path | Role |
|-------|------|------|
| Types / registry | `src/lib/rfo/types.ts`, `registry.ts` | `ReconAdapter`, `FabricObject`, `Orchestrator`, adapter map |
| Fabric store | `src/lib/rfo/fabric.ts` | In-memory + optional `fabric_objects` Postgres table |
| Orchestrator | `src/lib/rfo/orchestrator.ts` | Slack webhook / Resend email / dry-run no-op |
| Adapter: Harvest+QBO | `src/lib/rfo/adapters/harvest-qbo.ts` | Wraps `loadBrief` → `monday_pnl` fabric |
| Adapter: docs stub | `src/lib/rfo/adapters/stub-docs.ts` | Empty gap report (pluggability) |
| Play: Monday Brief | `src/lib/rfo/plays/monday-brief.ts` | Fabrication on `monday_pnl` |
| Play: margin risk | `src/lib/rfo/plays/margin-risk.ts` | Exceptions when margin &lt; threshold or labor &gt; revenue |
| Runner | `src/lib/rfo/run.ts` | `runPlay({ play, dryRun, notify })` |
| API | `POST /api/rfo/run`, `GET /api/rfo/exceptions` | Run plays / list exceptions |
| UI | `/rfo` | Explain R/F/O, run plays, list exceptions, env status |
| Nav / help | AppHeader **RFO**, `/help` → Where Kamo is going |

**Unchanged:** $49 Brief + $149 Studio Stripe checkout, OAuth, Sync, recon P&L math.

## Production

- App: https://monday-brief-xi.vercel.app
- RFO UI: https://monday-brief-xi.vercel.app/rfo
- `POST /api/rfo/run` · `GET /api/rfo/exceptions`

## How to run locally

```bash
cd monday-brief
npm i
npm test
npm run build
npm run dev   # http://localhost:3000/rfo
```

## Configure Slack / email

Add to `.env` (or Vercel project env) — never commit secrets:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
NOTIFY_EMAIL=you@agency.com
RESEND_API_KEY=re_...          # required to actually send email
RFO_FROM_EMAIL=kamo@yourdomain.com
MARGIN_RISK_THRESHOLD=0.2      # 20% gross margin floor
```

| Channel | Behavior when unset |
|---------|---------------------|
| Slack | Trigger becomes dry-run no-op |
| Email | Needs `NOTIFY_EMAIL` + `RESEND_API_KEY`; otherwise clear skip message |
| `dryRun: true` | Always no-op (UI default) |

Status (set/unset only) appears on `/rfo` and Connections → RFO notify.

## API

```bash
# Monday Brief play (recon → fabric)
curl -s -X POST http://localhost:3000/api/rfo/run \
  -H 'Content-Type: application/json' \
  -d '{"play":"monday_brief","dryRun":true,"notify":"none"}'

# Margin-risk scan + optional Slack (dry-run safe)
curl -s -X POST http://localhost:3000/api/rfo/run \
  -H 'Content-Type: application/json' \
  -d '{"play":"margin_risk","dryRun":true,"notify":"slack"}'

# List recent exception fabric objects
curl -s http://localhost:3000/api/rfo/exceptions
```

## Exception rules

For each reconciled project and client:

1. **over_serviced** — `laborCost > revenue`
2. **margin_below_threshold** — `grossMargin < MARGIN_RISK_THRESHOLD` (default `0.2`) when there is any revenue or labor activity

Same reconciler as `/brief` — no duplicated P&L math.


## Evidence

Kamino-style **evidence** on the margin-risk action path (not open GenBI). Every `margin_risk_exception` fabric object carries:

| Field | Meaning |
|-------|---------|
| `evidence.answer` | What's wrong / who (entity + reasons + margin vs floor) |
| `evidence.calculation` | Reconciler math as text: `revenue − laborCost = contribution; margin %` |
| `evidence.records[]` | Harvest/QBO ids, period, source systems (`Harvest + QBO`), labor hours |
| `evidence.gaps[]` | From existing `needsReview` / `missingCostRateHours` for that entity |

Built in `detectMarginRiskExceptions` — reuses reconciler output only. Slack/email (`formatObjectMessage`) renders Answer / Calculation / Records / Gaps as readable sections (soft-capped ~2.8k chars). `/rfo` UI shows the same blocks under each exception.

## Spike 2 handoff

`stub_docs` adapter already registers. Replace with a real documents/DB adapter implementing `ReconAdapter` — orchestrator and fabric store stay the same.

## OUT (honored)

Marketplace, any-DB platform, open GenBI chat, PSA/time UI, killing Brief, packing `.env` into deploys.
