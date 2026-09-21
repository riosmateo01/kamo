# Kamo — Product bet

**Locked by Mateo + Strategist · 2026-09-21**

Monday Brief is the **wedge**, not the company. Durable bet: private **Reconnaissance → Fabrication → Orchestration** on systems customers already run — trusted working objects + triggered action. Not ERP replacement. Not open GenBI. Niche Monday P&L proves one ritual; scale by repeating R→F→O and productizing fabric.

We are **not** cloning kamino.app GenBI. **Vs Kamino (1 sentence):** Kamino helps you ask about reconciled finance data; Kamo wires the stack so recon becomes a trusted object and that object triggers action — starting with Monday profit, not ending at chat.

---

## Vision

Agencies and operators drown in spreadsheets, half-connected tools, and manual rituals. Kamo’s durable bet is a repeatable private loop on systems they already run: **Reconnaissance** (examine spreadsheets, databases, manual steps, workflow problems), **Fabrication** (build the custom system / trusted working object), **Orchestration** (connect to existing company software; automate ongoing execution with triggers). Example surfaces over time: private data warehouses, AI agents, document processing, database connections, automated triggers — always as *custom engagements made product-shaped*, with fabric that can host a second ritual. The Monday client/project P&L brief is play #1 that proves the ritual; it is not the ceiling.

---

## Wedge vs platform

| | **Live wedge (do not break)** | **Platform bet (direction)** |
|---|---|---|
| Offer | Connect-only QBO + Harvest → reconciled client/project P&L → Monday brief + canned prompts | Private R→F→O on systems they already run; trusted objects + triggered action; productize fabric |
| Role | Proof ritual + design-partner bait | Company scale: repeat R→F→O; second workflows on same fabric |
| Pricing | **$49/mo** Brief + **$149/mo** Studio (Brief + extra RFO capacity) at https://monday-brief-xi.vercel.app · design-partner free path | **Model B (LOCKED):** keep wedge SaaS; primary $ from scoped RFO engagements |
| Connectors | QBO + Harvest (wedge) | Spike 1: reusable RFO skeleton on Brief fabric + one non-finance touch (docs/DB/warehouse slice) for one partner |
| Differentiation | Not open GenBI; fixed brief + prompts | Not Kamino chat — wire stack → trusted object → action |

**Hard constraint:** Keep the live wedge intact. Do **not** remove or break:

- QBO + Harvest connect-only recon
- Monday client/project P&L brief + canned prompts
- $49/mo Stripe at https://monday-brief-xi.vercel.app
- Design-partner free path

---

## Business model — Model B LOCKED

**LOCKED (Mateo + Strategist · 2026-09-21): Model B**

| Option | Verdict |
|--------|---------|
| **A** — Pure $49-only SaaS | Reject. Don’t bet the company on $49 alone. |
| **B** — $49 Monday Brief as proof / design-partner bait; primary revenue from scoped RFO engagements (second workflow on same fabric) | **LOCKED** |
| **C** — Services-only studio | Reject unless every job leaves reusable fabric (not the default plan). |

Do **not** kill $49. Do **not** bet the company on it alone. Primary dollars come from scoped recon→fabrication→orchestration engagements that leave fabric the Monday wedge already sits on.

---

## R / F / O product surface (vNext — what users see)

### 1. Reconnaissance

Examine spreadsheets, databases, manual steps, and workflow problems.

**User-facing:** a **Recon** workspace that inventories connected systems, accepts spreadsheet uploads, and produces a plain-language **gap report** (what’s connected, what’s manual, what’s missing) — feeding a trusted working object, not a chat transcript.

### 2. Fabrication

Build the custom system / AI solution on that fabric.

**User-facing:** the existing Monday brief + canned prompts as fabricated play #1 on the shared fabric-object model, plus a **second playbook** for one design partner (named trusted object, scoped outputs — not open chat; prefer non-finance touch).

### 3. Orchestration

Connect to existing company software; automate ongoing execution.

**User-facing:** scheduled **Sync** plus triggers (webhook / email / Slack) so the trusted object drives action. Spike 1: QBO+Harvest for Brief + one thin non-finance adapter for the partner’s second ritual.

---

## Explicit OUT for 30 days

Do **not** ship in the next ~30 days:

- Warehouse / agent marketplace
- Any-DB platform promises
- Freeze or kill the $49 MVP (or hard-paywall design partners off `/brief`)
- Multi-vertical sales push
- Open GenBI / freeform chat (kamino.app-style)
- PSA / time UI / scheduling / invoicing
- Rebrand that drops the Monday ritual
- Broad connector catalog / marketplace (one thin non-finance adapter for Spike 1 partner only)
- Standalone `/platform` marketing microsite (prefer short “Where Kamo is going” on `/help`)
- Changing Stripe Price, OAuth apps, or packing `.env` into deploys

---

## SaaS price IDs (live)

- **Kamo (brief) $49/mo:** `STRIPE_PRICE_ID` (existing)
- **Kamo Studio $149/mo:** `STRIPE_PRICE_ID_STUDIO=price_1UI98zE2PrbyyJu6ByKEZWDj` (product `prod_VIkeZEW1IvANpb`). Checkout `plan=studio`. Does not replace Model B / Spike 1 — Studio is the higher SaaS tier for Brief + additional R→F→O rituals.

## Spike 1 — LOCKED (upgraded platform skeleton)

**LOCKED (Mateo + Strategist · 2026-09-21 · Mateo pushback: broader RFO than “second ritual on finance-only fabric”)**

Mateo chose to push the **broader RFO platform** harder than Spike 1-lite (margin-risk-only on QBO+Harvest).

**Revised 30-day Spike 1:**

1. **KEEP** live **$49 Monday Brief** as wedge/demo (unchanged hard constraint).
2. **Ship a thin reusable RFO skeleton:** `recon adapter → fabric object → orchestrator` that **powers Monday Brief**, plus a **second workflow** on that skeleton for **one design partner**.
3. Second workflow = **O-path** (exception object → Slack/email). Non-finance docs/DB touch deferred to **Spike 2**; Spike 1 may stub the adapter interface so platform isn’t only a slide.
4. **Commercial still Model B:** wedge SaaS + hunt **one scoped RFO design-partner contract** in parallel.
5. **Still OUT:** marketplace, any-DB platform, kill Monday Brief, multi-vertical spray, open GenBI.

| Stage | Spike 1 surface |
|-------|-----------------|
| **Recon adapter** | Pluggable intake: QBO+Harvest (live wedge); stub interface ready for Spike 2 docs/DB |
| **Fabric object** | Shared trusted working-object model; Monday P&L object #1; partner **margin-risk / over-serviced** exception object |
| **Orchestrator** | Exception object → Slack **or** email action; Monday ritual + this O-path on same skeleton |

**Success = reusable skeleton powers Monday Brief + one partner O-path; $49 wedge untouched.**

### Second workflow — LOCKED (Mateo delegated · Strategist + Product Engineer · 2026-09-21)

**Ship the Orchestration path (not docs-first):**

- Fabricated **exception object** (margin-risk / over-serviced) → **Slack or email** action.
- Same thin RFO skeleton powers Monday Brief + this O-path.
- Rationale: R+F already exist on QBO+Harvest; biggest 30-day learning is whether **Kamo acts** (vs kamino-style ask).
- **Docs/DB non-finance adapter = Spike 2** once the adapter interface exists (Spike 1 may include a stub interface only).


Out of Spike 1: connector marketplace, “connect any DB” productization, GenBI chat, multi-partner spray, freezing/killing $49 Brief.

---

## Success metrics

| Metric | Signal |
|--------|--------|
| Wedge intact | Design partners still complete Monday ritual; $49/mo Checkout + free path both work |
| Model B | At least one scoped RFO conversation / engagement path exists without killing $49 |
| Spike 1 | Thin RFO skeleton powers Monday Brief; one design partner gets exception object → Slack/email (O-path); adapter stub for Spike 2 docs |
| No spray | No marketplace / any-DB platform / multi-vertical sales in Spike 1 |
| Positioning | Copy never frames Kamo as open GenBI; vs Kamino sentence holds |
| Spike discipline | Stripe/OAuth unchanged; tests + build green; OUT list honored |

---

## Strategist input — LOCKED (2026-09-21)

Folded above. Summary of locked guidance:

1. **Vision:** Monday Brief = wedge, not company. Durable bet = private R→F→O on systems they already run — trusted working objects + triggered action, not ERP replace / open GenBI. Niche Monday P&L proves one ritual; scale by repeating R→F→O and productizing fabric.
2. **Business model:** **Model B LOCKED** — keep $49 as proof/design-partner bait; primary $ from scoped RFO engagements (second workflow on same fabric). Not A (pure $49-only). Not C (services-only) unless every job leaves reusable fabric. Don’t kill $49; don’t bet the company on it alone.
3. **Spike 1 LOCKED (upgraded):** Thin reusable RFO skeleton (recon adapter → fabric object → orchestrator) powering Monday Brief + second workflow for one design partner with preferred non-finance touch (docs/DB/warehouse slice + trigger). Model B + hunt one scoped RFO contract. OUT: marketplace, any-DB platform, kill Brief, multi-vertical spray, open GenBI.
4. **Vs Kamino:** Kamino helps you ask about reconciled finance data; Kamo wires the stack so recon becomes a trusted object and that object triggers action — starting with Monday profit, not ending at chat.
