# Spike 0 — acceptance checklist

Build order. Check each box only when proven.

## Modules
- [ ] `connectors/harvest` — interface + **mock** adapter loading `fixtures/harvest.json`
- [ ] `connectors/qbo` — interface + **mock** adapter loading `fixtures/qbo.json`
- [ ] `mapping/` — resolves maps from `fixtures/mapping.json`; emits unmatched for Orphan Labs / Internal R&D
- [ ] `pnl/` — reconciler implements contracts in `contracts/types.ts`
- [ ] `brief/` — stub only (empty export or “not in Spike 0” README note)

## Behaviors
- [ ] Current week P&L for **Website Redesign** matches `expected-pnl.json` (rev 8000, cost 3000, GP 5000, margin 0.625, missingCostRateHours 4)
- [ ] Current week P&L for **Retainer Support** matches (rev 2000, cost 600, GP 1400, margin 0.7)
- [ ] **Acme Co** client rollup matches (rev 10000, cost 3600, GP 6400, margin 0.64)
- [ ] Prior-period deltas match expected (`revenueDelta` / `grossProfitDelta`)
- [ ] `h_proj_unmapped` is **not** in `projects[]`; it **is** in `needsReview`
- [ ] `te5` (null cost rate) contributes to `missingCostRateHours`, not `laborCost`
- [ ] Automated test fails loudly with path + expected + actual + explanation when numbers drift

## Engineering bar
- [ ] TypeScript
- [ ] `npm test` (or equivalent) green on fixtures alone — no live QBO/Harvest
- [ ] `npm run build` succeeds
- [ ] `.env.example` only — no secrets
- [ ] README points at `fixtures/WALKTHROUGH.md` for hand verification
- [ ] Postgres schema sketched (Prisma or Drizzle): raw sync + mapped entities + weekly snapshots — migrations OK even if tests don’t need a live DB yet

## Explicitly out of scope for Spike 0
- Real OAuth
- Monday brief UI polish
- Open-ended NL / GenBI chat
- Time-tracking UI, scheduling, invoicing

## Pass bar (product)
Every money field within **±$1** of expected, or grossMargin within **0.1%** relative. Silent wrong numbers = fail.
