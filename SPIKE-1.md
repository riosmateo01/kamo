# Spike 1 — Connector scaffolding

Real connector path on top of the Spike 0 fixture-backed UI. Same reconciler; prove numbers; no open GenBI chat. **QBO + Harvest only.**

## What was built

| Area | Location |
|------|----------|
| Postgres schema (Drizzle) | `src/db/schema.ts`, `drizzle/0000_spike1_init.sql` |
| Optional DB client | `src/db/client.ts` — null when no `DATABASE_URL` |
| OAuth stubs | `/api/auth/harvest/start\|callback`, `/api/auth/qbo/start\|callback` |
| Sync module | `src/lib/sync/` — pull Harvest/QBO, seed fixtures, run sync |
| Connector switch | `loadBrief()` → **live** if recent DB sync, else **fixtures** |
| Connections UI | `/settings/connections` |
| Canned prompts | `/prompts` runs filters against reconciler output |
| Env template | `.env.example` |

Token columns store **ciphertext stubs** (`encryptTokenStub`). Production must replace with real encryption (AES-GCM / KMS).

## Run without Postgres (default)

```bash
cd monday-brief
npm i
npm run dev        # http://localhost:3000 — badge: fixtures
npm test
npm run build
```

UI, OAuth start routes (friendly errors), Sync now (noop message), and prompts all work without a database.

## Run with Postgres (optional live path)

```bash
# One-liner Postgres
docker run --name monday-pg -e POSTGRES_USER=monday -e POSTGRES_PASSWORD=monday \
  -e POSTGRES_DB=monday_brief -p 5432:5432 -d postgres:16

cp .env.example .env
# Set DATABASE_URL=postgresql://monday:monday@localhost:5432/monday_brief
# Set SESSION_SECRET=$(openssl rand -base64 32)

npm run db:migrate
npm run dev
# Then Settings → "Seed fixtures → DB"  OR  POST /api/sync/seed-fixtures
# Refresh brief — badge should say live
```

Migrate without Docker: any Postgres 14+ and `DATABASE_URL`, then `npm run db:migrate`.

## Harvest developer credentials

1. Open [Harvest Developers](https://id.getharvest.com/developers)
2. Create an OAuth2 application
3. Redirect URI: `http://localhost:3000/api/auth/harvest/callback` (or your `HARVEST_REDIRECT_URI`)
4. Copy Client ID + Client Secret into `.env` as `HARVEST_CLIENT_ID` / `HARVEST_CLIENT_SECRET`

## Intuit QuickBooks Online credentials

1. Open [Intuit Developer Dashboard](https://developer.intuit.com/app/developer/dashboard)
2. Create an app with **Accounting** scope (QuickBooks Online)
3. Redirect URI: `http://localhost:3000/api/auth/qbo/callback`
4. Use **Sandbox** keys while developing (`QBO_ENVIRONMENT=sandbox`)
5. Copy Client ID + Client Secret → `QBO_CLIENT_ID` / `QBO_CLIENT_SECRET`

## OAuth flow (stubs)

- **Start** redirects to provider authorize URL when env is set; otherwise HTML error explaining missing vars.
- **Callback** validates `state`, exchanges `code` for tokens when env is present, stores ciphertext in `connection_tokens`.
- Live **API pull** after OAuth still needs real apps: Sync now with non-fixture tokens returns a clear TODO noop. Fixture stub tokens (from seed) re-pull mocks → DB.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Marketing landing |
| `/brief` | Monday profit brief (`fixtures` / `live` badge) |
| `/prompts` | Canned prompts → reconciler slices |
| `/settings/connections` | Harvest/QBO status, Connect, Sync now, Seed |
| `/api/auth/harvest/start` | Start Harvest OAuth |
| `/api/auth/harvest/callback` | Harvest callback |
| `/api/auth/qbo/start` | Start QBO OAuth |
| `/api/auth/qbo/callback` | QBO callback |
| `/api/sync` | POST sync stub |
| `/api/sync/seed-fixtures` | POST fixture → DB seed |

## What Mateo must supply for truly live

- `HARVEST_CLIENT_ID` + `HARVEST_CLIENT_SECRET` (Harvest OAuth app)
- `QBO_CLIENT_ID` + `QBO_CLIENT_SECRET` (Intuit app)
- Matching redirect URIs + `SESSION_SECRET`
- Postgres (`DATABASE_URL`)
- (Next spike) wire live Harvest/QBO HTTP clients behind the existing pull interfaces — stubs stop at token exchange + mock→DB demos

## Product fences (unchanged)

In: QBO + Harvest, same reconciler, prove numbers, canned prompts only.  
Out: time-tracking UI, scheduling, invoicing, multi-GL, Float/Productive, open GenBI chat.
