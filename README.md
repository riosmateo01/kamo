# Kamo

Kamo — connect-only QBO + Harvest → reconciled client/project P&L → your Monday profit brief.

Public marketing at `/` (hero, contrast, how it works, **$49/mo** pricing). Help at `/help`. Product brief at `/brief`. Stripe subscription + soft upgrade banner. **Not** open GenBI chat.

Go-live: see **GO-LIVE.md** (Stripe Price, Vercel env, Postgres, OAuth URIs, webhook).

## Run (fixture-backed UI — no DB / no OAuth required)

```bash
npm i
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (marketing) or [http://localhost:3000/brief](http://localhost:3000/brief) (product). Badge shows **fixtures** until Postgres is seeded/synced.

```bash
npm test          # vitest (recon + prompts + HTTP client mappers)
npm run build     # Next.js production build
```

## Product bet

Monday Brief is the **wedge**, not the company. Durable bet: private **recon → fabrication → orchestration** on systems customers already run (Model **B** LOCKED: keep $49; primary $ from scoped RFO engagements). Spike 1: second ritual on same QBO+Harvest fabric. See **PRODUCT-BET.md**.

## Spike docs

- **SPIKE-1.md** — OAuth stubs, Drizzle schema, connections UI, fixture→DB seed
- **SPIKE-2.md** — Live Harvest + QBO HTTP pulls, Invoice revenue approach, sandbox checklist

## Optional Postgres + live sync

```bash
cp .env.example .env   # DATABASE_URL + SESSION_SECRET (+ OAuth client ids when ready)
npm run db:migrate
# Settings → Seed fixtures → DB  → refresh brief → badge: live
# OR Connect Harvest/QBO (needs Mateo’s apps) → Sync now → live API → raw tables
```

Without `HARVEST_CLIENT_*` / `QBO_CLIENT_*`, Connect shows a configure-env page (no fake credentials).

## Routes

| Path | Purpose |
|------|---------|
| `/` | Public marketing landing |
| `/help` | How to use Kamo — Monday ritual walkthrough |
| `/brief` | Monday profit brief — period picker, winners/losers, watchlist, needs review |
| `/prompts` | Canned prompts (run against reconciler output) |
| `/settings/connections` | Harvest/QBO connect status + Sync now |
| `/api/auth/harvest/*` | Harvest OAuth start/callback |
| `/api/auth/qbo/*` | QBO OAuth start/callback |
| `/api/sync` | Sync: fixture mocks or live HTTP → raw tables (~60d lookback) |
| `/api/sync/seed-fixtures` | Seed fixtures into DB (local demo without OAuth) |
| `/api/stripe/checkout` | Create Stripe Checkout Session ($49/mo subscription) |
| `/api/stripe/webhook` | Stripe webhooks → subscription status (Postgres) |
| `/api/stripe/portal` | Stripe Customer Portal session |
| `/billing/success` | Post-checkout success |
| `/billing/cancel` | Checkout canceled |

### Period query params (`/brief`, `/prompts`)

| Param | Values | Notes |
|-------|--------|-------|
| `period` | `last_week` (default), `mtd`, `custom` | Persisted in URL |
| `start` / `end` | `YYYY-MM-DD` | Required for `custom` |

**Period rules:** last_week = prior Mon–Sun calendar week; MTD = 1st of month → today; prior for MTD = previous full month. Fixture `last_week` stays aligned to sandbox `2026-09-08…14`. See `src/lib/brief/period.ts`.

## Modules

- `src/lib/connectors/` — Harvest + QBO mocks, DB adapters, **live HTTP**
- `src/lib/mapping/` — identity map + unmatched queue + name suggest
- `src/lib/pnl/` — reconciler + tolerance assert
- `src/lib/brief/` — `loadBrief()` / `loadFixtureBrief()` + prompt filters
- `src/lib/sync/` — pull + seed + connection status + live/fixture switch
- `src/lib/auth/` — OAuth config, token stub crypto, refresh
- `src/lib/billing/` — pricing constants, Stripe helpers, subscription upsert
- `src/db/` — Drizzle schema + optional client

See `ACCEPTANCE.md`, `WALKTHROUGH.md`, `README-SPIKE0.md`.
