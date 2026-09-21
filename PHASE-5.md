# Phase 5 — Constrained Ask

`/ask` accepts natural-language operating questions, compiles them into a
validated internal query, and executes only approved calculations against the
reconciled P&L object.

## Safety boundary

- No generated SQL.
- No arbitrary table, field, or expression access.
- Four approved measures: revenue, labor cost, gross profit, gross margin.
- Two approved dimensions: project and client.
- Result limits are capped at 25.
- Every query is organization-scoped, authenticated, and audited.
- Returned rows carry the same calculation and record lineage as the dashboard.

## Next

- Add validated date, project, client, and threshold filters to the AST.
- Add organization-role masking before returning source records.
- Let a model translate language into this schema, while retaining deterministic
  validation and execution.
- Add saved questions and scheduled delivery.
- Generate narrative summaries from aggregates only, never raw financial rows.
