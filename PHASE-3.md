# Phase 3 — Data Health

The product now has a first-class `/data-health` surface rather than scattering
trust signals across Connections, Mapping, and the Monday Brief.

## Included

- Organization-scoped connection, sync, mapping, and reconciliation checks.
- A deterministic 0–100 health score.
- Critical findings for unavailable storage, disconnected sources, and failed
  syncs.
- Warnings for fixture mode, unmatched identities, and missing cost rates.
- Exact excluded-hour totals and direct remediation links.
- Protected navigation entry and unit coverage for score/severity behavior.

## Next

- Store connector row counts and rejection reasons per sync run.
- Add retry state and job age to failed-sync findings.
- Detect duplicate identities and stale mappings.
- Express report prerequisites as domain metadata and show report coverage.
- Add an API representation for monitoring and scheduled health summaries.
