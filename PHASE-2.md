# Phase 2 — Traceable metrics

Kamo's dashboard figures now carry a canonical evidence object designed to be
shared by dashboards, reports, exports, and the future constrained Ask surface.

## Shipped in this slice

- `MetricResult` contains value, unit, scope, period, calculation, source
  records, and explicit data gaps.
- Project P&L results retain the QBO revenue lines and Harvest time entries that
  produced each number.
- Missing cost rates are shown as excluded records and explicit gaps.
- Client evidence rolls up the evidence of its mapped projects.
- Summary cards expose “View working”.
- Every project row opens a calculation dialog with source-level evidence.
- Reconciler tests verify that evidence values tie back to reported values.

## Next traceability slice

- Persist immutable source lineage identifiers with report snapshots.
- Add invoice document numbers and employee-safe display labels at ingestion.
- Add organization-role masking before evidence is serialized to the browser.
- Add freshness and connector sync-run identifiers to `MetricResult`.
- Reuse `MetricResult` in the report catalogue and constrained query AST.
