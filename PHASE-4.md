# Phase 4 — Governed report catalogue

The product now exposes a `/reports` catalogue whose readiness is calculated
from both connected data domains and whether an execution surface exists.

## Included

- Twelve named report definitions across profitability, revenue, delivery, and
  working capital.
- Machine-readable data-domain prerequisites.
- Honest `Ready` versus `Waiting` states; connecting a domain never marks an
  unimplemented report ready.
- Direct routes into the existing Monday Brief, project evidence, needs-review,
  and margin-risk surfaces.
- Protected product navigation and coverage tests.

## Next

- Build dedicated client contribution and revenue concentration executions.
- Add saved scopes, sorting, and filters.
- Add CSV/XLSX export with the same organization and field permissions.
- Persist report runs and schedules.
- Feed report definitions into the constrained Ask query planner.
