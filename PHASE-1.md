# Phase 1 — Safe SaaS foundation

Multi-tenant security baseline: Clerk orgs, AES-256-GCM tokens, org-scoped data,
signed Stripe webhooks, OAuth state identity, audit log, idempotent jobs.

## Setup checklist (Mateo)

### 1. Clerk dashboard

1. Create a Clerk application (Next.js).
2. **Enable Organizations** (Dashboard → Organization Settings → enable).
3. Optionally require org membership before product access.
4. Copy keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
5. Set paths:
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/brief`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/brief`
6. Create at least one Organization and invite yourself; select it in the app switcher.

### 2. Token encryption

```bash
openssl rand -base64 32
```

Set as `TOKEN_ENCRYPTION_KEY` (32 bytes base64 **or** 64-char hex).

**Migration:** Old `stub-v1:` Base64 tokens will **not** decrypt. Re-connect Harvest/QBO after deploy.

### 3. Database migration

```bash
npm run db:migrate
```

Applies `drizzle/0003_phase1_org_security.sql` (adds `organization_id`, `audit_events`, `jobs`).

Legacy rows get `organization_id = 'legacy'`. Prefer wiping prod demo DB or accepting legacy until re-connect.

### 4. Stripe (unchanged price IDs)

- Keep `STRIPE_PRICE_ID` ($49) and `STRIPE_PRICE_ID_STUDIO` ($149).
- Checkout attaches `metadata.organization_id` + `client_reference_id`.
- **Never** send Stripe `customerId` from the browser — portal/checkout resolve from org mapping.
- Production **requires** `STRIPE_WEBHOOK_SECRET`. Unsigned payloads are rejected unless non-prod + `STRIPE_WEBHOOK_ALLOW_UNSIGNED=1`.

### 5. Cron / jobs

Vercel Cron → `POST /api/jobs/drain` with header:

```
Authorization: Bearer $CRON_SECRET
# or
x-cron-secret: $CRON_SECRET
```

Or drain while signed in (org-scoped). Sync API enqueues jobs; pass `{ "wait": true }` for local DX.

### 6. Protected vs public routes

| Protected (Clerk) | Public |
|-------------------|--------|
| `/brief`, `/rfo`, `/settings/*`, `/prompts` | `/`, `/help`, `/billing/*` |
| `/api/sync/*`, `/api/rfo/*` | `/sign-in`, `/sign-up` |
| `/api/auth/*/start`, `/api/stripe/checkout`, `/api/stripe/portal`, `/api/jobs/*` | `/api/stripe/webhook` (signature-verified) |
| | `/api/auth/*/callback` (state-verified) |

Proxy file: `src/proxy.ts` (Next.js 16).

## Env vars (new / changed)

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes (prod) | Clerk publishable |
| `CLERK_SECRET_KEY` | yes (prod) | Clerk secret |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | yes | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | yes | `/sign-up` |
| `TOKEN_ENCRYPTION_KEY` | yes (for OAuth) | `openssl rand -base64 32` |
| `CRON_SECRET` | for cron drain | Bearer / x-cron-secret |
| `STRIPE_WEBHOOK_SECRET` | yes (prod) | Required in production |
| `STRIPE_WEBHOOK_ALLOW_UNSIGNED` | optional | `1` only for local unsigned |

Build uses placeholder Clerk keys in `next.config.ts` when unset so CI can compile. **Vercel production must set real keys.**

## Audit actions

`oauth.connect`, `sync.enqueue`, `sync.run`, `checkout.create`, `webhook.subscription`, `seed.blocked`, `seed.run`, `rfo.notify`, `rfo.run`, `jobs.drain`

Table `audit_events` is append-only (no update/delete API).

## Tests

```bash
npm test
npm run build
```

`requireOrg` is mockable via `setRequireOrgMock` so unit tests skip live Clerk.
