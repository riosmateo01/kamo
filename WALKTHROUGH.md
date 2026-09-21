# Fixture P&L walkthrough (hand calc)

Period **current**: 2026-09-08 → 2026-09-14  
Period **prior**: 2026-09-01 → 2026-09-07

## Mapping
| Harvest | QBO |
|---------|-----|
| Acme Co (`h_client_acme`) | Acme Co (`qbo_cust_acme`) |
| Website Redesign | Website Redesign job |
| Retainer Support | Retainer Support job |
| Orphan Labs / Internal R&D | **unmapped → needsReview** |

## Website Redesign — current
| Entry | Hours | Rate | Cost |
|-------|------:|-----:|-----:|
| te1 | 16 | 75 | 1200 |
| te2 | 24 | 75 | 1800 |
| te5 | 4 | *null* | *excluded; flag missing* |
| **Cost subtotal** | **40** billed-with-rate | | **3000** |
| Revenue (rev1) | | | **8000** |
| **GP** | | | **5000** (62.5%) |

Prior: 16+16=32h @75 = 2400 cost; rev 6000; GP 3600.  
Deltas: revenue +2000, GP +1400.

## Retainer Support — current
| Entry | Hours | Rate | Cost |
|-------|------:|-----:|-----:|
| te3 | 10 | 60 | 600 |
| Revenue (rev2) | | | 2000 |
| **GP** | | | **1400** (70%) |

Prior: 12h @60 = 720; rev 2000; GP 1280.  
Deltas: revenue 0, GP +120.

## Acme Co (client rollup) — current
- Revenue 10000, laborCost 3600, missingCostRateHours 4, GP 6400, margin 64%
- Prior: rev 8000, cost 3120, GP 4880 → deltas +2000 rev, +1520 GP

## Pass bar
Actual vs `expected-pnl.json` within **±$1** absolute on money fields, or **0.1%** relative on grossMargin. Every mismatch needs an explanation string in the test output.
