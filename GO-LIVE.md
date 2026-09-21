# Kamo — Go-live checklist

**Phase 1 (auth / multi-tenant security):** see **PHASE-1.md** — Clerk orgs, `TOKEN_ENCRYPTION_KEY`, `organization_id` migration `0003_phase1_org_security.sql`, signed webhooks, jobs drain cron.

Ship the public marketing site + Stripe subscriptions: **Kamo $49/mo** (Monday Brief) and **Kamo Studio $149/mo**.

Product direction (platform bet, wedge intact): **PRODUCT-BET.md**.

## 1. Create Stripe product & price ($49/mo)

1. Open [Stripe Dashboard → Products](https://dashboard.stripe.com/products).
2. **Add product**
   - Name: `Kamo`
   - Description: Agency profit brief from QBO + Harvest (connect-only).
3. **Pricing**
   - Price: **$49.00 USD**
   - Billing period: **Monthly** (recurring)
   - Leave metered off
4. Save → copy the **Price ID** (`price_…`).
5. Put it in env as `STRIPE_PRICE_ID`.

Optional: enable Customer Portal under **Settings → Billing → Customer portal** (cancel / update payment method).

Use **test mode** keys (`sk_test_…` / `pk_test_…`) until you are ready for live charges.


## 1b. Create Stripe product & price — Kamo Studio ($149/mo)

Live Price already created (do not recreate unless rotating):

| | |
|--|--|
| Product | Kamo Studio `prod_VIkeZEW1IvANpb` |
| Price | `price_1UI98zE2PrbyyJu6ByKEZWDj` = **$149/mo** |
| Env | `STRIPE_PRICE_ID_STUDIO=price_1UI98zE2PrbyyJu6ByKEZWDj` |

Checkout: `POST /api/stripe/checkout` with `{ "plan": "studio" }` (default `plan` is `brief` → `STRIPE_PRICE_ID`).

## 2. Vercel project + env vars

1. Import the `monday-brief` app (this directory) into Vercel.
2. Framework: Next.js (auto-detected).
3. Set environment variables (Production + Preview as needed):

| Variable | Required | Notes |
|----------|----------|--------|
| `APP_BASE_URL` | yes | `https://your-domain.com` (no trailing slash) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes (prod) | Clerk — see PHASE-1.md |
| `CLERK_SECRET_KEY` | yes (prod) | Clerk secret |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | yes | `/sign-in` |
| `TOKEN_ENCRYPTION_KEY` | yes (OAuth) | `openssl rand -base64 32` |
| `CRON_SECRET` | for jobs cron | Bearer for `/api/jobs/drain` |
| `DATABASE_URL` | yes (prod) | Neon / Supabase / Vercel Postgres connection string |
| `SESSION_SECRET` | yes | `openssl rand -base64 32` |
| `HARVEST_CLIENT_ID` | for live Harvest | Harvest developer app |
| `HARVEST_CLIENT_SECRET` | for live Harvest | |
| `HARVEST_REDIRECT_URI` | for live Harvest | `{APP_BASE_URL}/api/auth/harvest/callback` |
| `HARVEST_USER_AGENT` | recommended | e.g. `Kamo (you@agency.com)` |
| `QBO_CLIENT_ID` | for live QBO | Intuit developer app |
| `QBO_CLIENT_SECRET` | for live QBO | |
| `QBO_REDIRECT_URI` | for live QBO | `{APP_BASE_URL}/api/auth/qbo/callback` |
| `QBO_ENVIRONMENT` | yes | `sandbox` then `production` |
| `SYNC_FRESHNESS_HOURS` | optional | default `168` |
| `STRIPE_SECRET_KEY` | for billing | `sk_test_…` / `sk_live_…` |
| `STRIPE_PUBLISHABLE_KEY` | for billing | `pk_…` (server alias) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | for billing | same `pk_…` for client if needed |
| `STRIPE_PRICE_ID` | for billing | `price_…` $49 Kamo (brief) from step 1 |
| `STRIPE_PRICE_ID_STUDIO` | for Studio tier | `price_1UI98zE2PrbyyJu6ByKEZWDj` ($149/mo) — see §1b |
| `STRIPE_WEBHOOK_SECRET` | for webhooks | `whsec_…` from step 5 |

Without Stripe vars, CTAs show **Configure Stripe** / demo mode — the app does not crash. Without DB, the brief runs on fixtures.

## 3. Postgres

1. Create a database (Neon, Supabase, or Vercel Postgres).
2. Set `DATABASE_URL`.
3. Run migrations:

```bash
npm run db:migrate
```

Applies `drizzle/0000`…`0003_phase1_org_security.sql` (tokens, sync, maps, subscriptions, fabric, **organization_id**, audit_events, jobs).

## 4. OAuth redirect URIs (production URL)

Update developer consoles to match `APP_BASE_URL`:

- **Harvest:** `https://YOUR_DOMAIN/api/auth/harvest/callback`
- **Intuit (QBO):** `https://YOUR_DOMAIN/api/auth/qbo/callback`

Also set `HARVEST_REDIRECT_URI` / `QBO_REDIRECT_URI` env vars to those same URLs.

## 5. Stripe webhook endpoint

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://YOUR_DOMAIN/api/stripe/webhook`
3. Events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET`.

Local tip: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

Production **rejects** unsigned webhooks. Dev: set `STRIPE_WEBHOOK_SECRET`, or explicitly `STRIPE_WEBHOOK_ALLOW_UNSIGNED=1` (default off).

Subscription rows land in Postgres `subscriptions` when `DATABASE_URL` is set; otherwise the webhook still returns `received` and logs a stub note.

## 6. Custom domain (optional)

1. Vercel → Project → Domains → add `mondaybrief.youragency.com` (or similar).
2. Point DNS as instructed.
3. Update `APP_BASE_URL`, OAuth redirect URIs, and Stripe webhook URL to the custom domain.
4. Redeploy.

## Soft gate / design partners

- `/brief` requires Clerk auth + organization (Phase 1). Soft paywall (Upgrade banner) still applies when no active org subscription.
- An **Upgrade** banner appears when there is no active subscription (design partners stay free).
- Checkout: `POST /api/stripe/checkout` body `{ plan?: "brief"|"studio" }` → Stripe Checkout (`mode=subscription`). Default `brief` ($49); `studio` uses `STRIPE_PRICE_ID_STUDIO` ($149).
- Portal: `POST /api/stripe/portal` when a Stripe customer id is on file.

## Smoke test after deploy

```bash
npm test
npm run build
```

Then: open `/` → Pricing CTA → (test mode) complete Checkout → `/billing/success` → `/brief` → Connect + Sync.
