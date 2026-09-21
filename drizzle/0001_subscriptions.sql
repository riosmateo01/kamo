-- Stripe subscriptions (go-live). Apply with: npm run db:migrate
-- Safe to re-run (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "stripe_customer_id" text NOT NULL,
  "stripe_subscription_id" text NOT NULL,
  "status" text NOT NULL,
  "price_id" text,
  "current_period_end" timestamp with time zone,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_sub_uidx" ON "subscriptions" ("stripe_subscription_id");
CREATE INDEX IF NOT EXISTS "subscriptions_customer_idx" ON "subscriptions" ("stripe_customer_id");
