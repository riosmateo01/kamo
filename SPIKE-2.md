# Spike 2 — Live Harvest + QBO HTTP pulls

Real HTTP clients behind the Spike 1 sync path. Fixture-only mode still works with **no env** (`npm test` / `npm run dev` without DB).

## What was built

| Area | Location |
|------|----------|
| Harvest API v2 client | `src/lib/connectors/harvest/http.ts` |
| QBO Accounting API v3 client | `src/lib/connectors/qbo/http.ts` |
| Shared fetch + 429 retry | `src/lib/http/fetch-json.ts` |
| Token refresh (when `refresh_token` stored) | `src/lib/auth/token-refresh.ts` |
| Sync switch (fixture vs live) | `src/lib/sync/run-sync.ts` |
| Name-match map suggest (bonus) | `src/lib/mapping/suggest.ts` |
| Harvest callback stores account id | `src/app/api/auth/harvest/callback/route.ts` |

## How sync works

```
POST /api/sync  →  runSyncNow()
  ├─ no DATABASE_URL            → noop (brief stays fixtures)
  ├─ no connection_tokens       → noop (seed-fixtures hint)
  ├─ token decrypts to fixture-* → pullHarvest/Qbo(mock) → raw tables
  └─ real access token          → ensureFreshAccessToken()
                                  → createHarvestHttp / createQboHttp
                                  → pull* → raw tables
                                  → optional name-match insert into identity maps
                                     (only adds missing exact-name matches)
```

`loadBrief()` is unchanged: recent DB sync → live badge from raw tables; else fixtures.

## Harvest endpoints used

Base: `https://api.harvestapp.com/v2`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/clients` | List clients → `HarvestClient` |
| GET | `/projects` | List projects → `HarvestProject` |
| GET | `/time_entries?from=&to=` | Time in range → `HarvestTimeEntry` (`cost_rate` → `costRate`) |

Account discovery (after OAuth):

| Method | Path | Purpose |
|--------|------|---------|
| GET | `https://id.getharvest.com/api/v2/accounts` | Resolve `Harvest-Account-Id` |

**Required headers:** `Authorization: Bearer …`, `Harvest-Account-Id`, `User-Agent` (set via `HARVEST_USER_AGENT` or default).

**Account id storage:** stored in `connection_tokens.realmId` for provider `harvest` (shared column). Fallback: `HARVEST_ACCOUNT_ID` env.

**OAuth token:** `https://id.getharvest.com/api/v2/oauth2/token` (auth code + refresh_token grant).

**Scopes:** Harvest OAuth apps grant account access selected by the user at authorize time (typically `harvest:ACCOUNT_ID`). No separate scope string required in start URL for Spike 2.

**Rate limits:** Harvest documents fair-use / HTTP 429. Client retries 429/5xx with backoff (2 retries). Prefer `per_page=100` pagination.

## QBO endpoints used

Base (sandbox): `https://sandbox-quickbooks.api.intuit.com`  
Base (production): `https://quickbooks.api.intuit.com`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v3/company/{realmId}/query?query=SELECT * FROM Customer…` | Parents + jobs |
| GET | `/v3/company/{realmId}/query?query=SELECT * FROM Invoice WHERE TxnDate >= '…' AND TxnDate <= '…'` | Revenue |

OAuth: authorize `https://appcenter.intuit.com/connect/oauth2`, token `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`.

**Scope:** `com.intuit.quickbooks.accounting` (set on Intuit app + authorize).

**realmId:** returned on OAuth callback as `?realmId=` and stored on the token row. Required for every Accounting API call.

### Revenue approach: **Invoices (not Payments)**

We attribute **Invoice.TotalAmt** by **TxnDate** to `CustomerRef`:

- If customer is a **Job** (`Job=true`) → `jobId = CustomerRef`, `customerId = ParentRef`
- Else → both `jobId` and `customerId` = parent customer id (customer-level revenue)

**Why invoices:** Monday brief P&L wants recognized billings by date aligned to project/job mapping. Payments lag and can split across invoices; invoices match the fixture model (`QboRevenueLine`) cleanly. Documented tradeoff: cash timing ≠ invoice timing; switch to Payment later if Mateo prefers cash-basis.

**Rate limits (approx):** ~500 requests/min/realm, ~10 concurrent; HTTP 429 → retry with `Retry-After` / backoff. Query pages `MAXRESULTS 1000`.

## Mapping live payloads → domain types

| API field | Domain |
|-----------|--------|
| Harvest `client.id/name` | `HarvestClient` |
| Harvest `project.id`, `client.id`, `name`, `code` | `HarvestProject` |
| Harvest `time_entry` + `cost_rate` | `HarvestTimeEntry` |
| QBO Customer `Job=false` | `QboCustomer` |
| QBO Customer `Job=true` + `ParentRef` | `QboJob` |
| QBO Invoice | `QboRevenueLine` (`id` = `inv_{Id}`) |

Identity mapping still uses `client_identity_maps` / `project_identity_maps`. After a live pull, exact case-insensitive name matches may be **auto-inserted** when no row exists yet (never overwrites).

## Fixture path (unchanged)

- No `DATABASE_URL` → brief fixtures, Sync noop
- Seed fixtures → DB still works for local live badge demos
- `npm test` / `npm run build` / `npm run dev` require **no** OAuth secrets

## How to test with sandbox (Mateo)

### Prerequisites

1. Postgres + `DATABASE_URL` + `npm run db:migrate`
2. `SESSION_SECRET` set
3. Harvest OAuth app + Intuit sandbox app (see checklist below)

### Flow

1. `cp .env.example .env` and fill client ids/secrets + redirect URIs matching the apps
2. `QBO_ENVIRONMENT=sandbox`
3. `npm run dev` → Settings → Connect Harvest → Connect QBO
4. **Sync now** → raw tables fill; badge → **live** after refresh
5. Unmapped names appear in Needs review; exact name matches may auto-map

### Without Mateo’s OAuth apps

Connect buttons still work but show **configure env** HTML (missing `HARVEST_CLIENT_*` / `QBO_CLIENT_*`). Use **Seed fixtures → DB** for a local live-mode demo. **No fake credentials** are committed.

## Token refresh

If `expires_at` is near/past and `refresh_token_cipher` is present (non-fixture), sync calls:

- Harvest: `grant_type=refresh_token` + client id/secret
- QBO: Basic auth + `grant_type=refresh_token`

Updated tokens are written back (still via `encryptTokenStub` — replace with real encryption before production).

## What still needs Mateo’s OAuth apps

- [ ] Create Harvest developer OAuth app; copy Client ID/Secret → `.env`
- [ ] Redirect URI exact match: `HARVEST_REDIRECT_URI`
- [ ] Create Intuit app with Accounting scope; sandbox keys → `.env`
- [ ] Redirect URI exact match: `QBO_REDIRECT_URI`
- [ ] `SESSION_SECRET` + `DATABASE_URL` + migrate
- [ ] Connect both providers; Sync now; verify brief numbers vs Harvest/QBO UI

## Product fences (unchanged)

In: QBO + Harvest, same reconciler, prove numbers, canned prompts only.  
Out: time-tracking UI, scheduling, invoicing UI, multi-GL, Float/Productive, open GenBI chat.
