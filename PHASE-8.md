# Phase 8: Hero Artifacts + Dual-Audience Surfaces

**Source of truth:** CLAUDE.md is canonical. This document extends the phase
plan with Phase 8 items that strengthen both prototype audiences — Cynthia's
portfolio and the FuseIQ vision demo — using a single codebase.

**Strategic context:** the prototype primarily serves Cynthia's portfolio
(cynthiairani.design) and secondarily serves as the working demo of the FuseIQ
strategy articulated in Hans Fischmann's May 2026 ELT deck. The same artifacts,
viewed through different demo paths, serve both audiences.

**Seed company:** Norwest Analytics. See `src/data/seed-company.ts`. This is
the canonical demo state. All Phase 8 artifacts render from this seed.

---

## Phase 8 items

### 8C — CFO Narrative artifact (PRIORITY 1)

The hero artifact for both audiences. Auto-drafted budget-meeting narrative
that ties spend to outcome with provenance per claim.

**New type in `src/types/campaign.ts`:**
- `CFONarrative` with `id`, `name`, `month`, `status` (matches StrategyPlanStatus),
  `advertiserId`, sections (spendByChannel, attributionByChannel, whatChanged,
  recommendedNextMoves, confidenceSummary), timestamps
- Each section follows the existing `StrategySection` schema (label, value,
  provenance, readiness, editable, authorshipState, filled, editHistory)

**New pattern component:** `src/components/patterns/cfo-narrative-card.tsx`
- Header: narrative name (editable), month label, status badge, export action
- Section: Spend by channel — table with channel, spend, % of total, MoM trend
- Section: Attribution by channel — table with channel, attributed revenue,
  % of total, attribution method (cite the model used, e.g. "Shapley-derived,
  90-day window")
- Section: What changed and why — bulleted list of material changes with
  provenance per item
- Section: Recommended next moves — list of proposed actions tied to evidence,
  each with confidence level
- Section: Confidence summary — overall confidence statement, data freshness,
  caveats
- Footer: approval flow (reuse approver picker), export to PDF action

**Context changes (`src/contexts/campaign-context.tsx`):**
- Add `savedNarratives: CFONarrative[]` to state
- Add `saveNarrative()`, `loadNarrative()`, `updateNarrativeSection()` methods
- Persist to localStorage key `fuseiq-narratives`

**Nav integration:**
- Saved narratives appear in the Reports nav surface, grouped by month
- Reports page lists narratives with status badge, advertiser, last-modified

**Generation logic:** `src/data/narrative-flow.ts`
- `buildNarrativeFromSeed(seedMonth, advertiser)` returns a `CFONarrative`
  pre-populated with provenance citing SEED_PERFORMANCE and SEED_ANOMALIES
- Sections render as `proposed` until reviewed; user can edit any section,
  flipping state to `edited` → `decided` on approve
- One section uses `provenance.source = "platform_signal"` to demonstrate
  cross-customer learning (the attribution method section: "Shapley-derived,
  validated against 1,200+ comparable B2B SaaS accounts on platform")

**Export to PDF:**
- Client-side PDF using `react-pdf` or `jspdf` (justify the dependency choice)
- Renders the narrative in print-clean styling: header, sections, footer
  with provenance footnotes
- Filename: `{advertiser-name}-{month}-cfo-narrative.pdf`

**Suggested prompts addition (`src/data/suggested-prompts.ts`):**
- Add "Draft my CFO narrative for May" as a suggested prompt
- Add "What changed in paid social this month?" as a suggested prompt

**Out of scope for 8C:**
- Real attribution math (Shapley, Survival, PIE) — fully mocked from seed data
- Real PDF styling beyond clean readable defaults
- Real-time data refresh — narratives are point-in-time from seed

---

### 8D — Orientation artifact (PRIORITY 2)

Return-visit Monday-morning briefing. Replaces the Step 8A banner concept
with a full artifact rendered in the Home canvas.

**New type:**
- `Orientation` with `id`, `generatedAt`, `summary` (one-line system voice),
  sections (onFire, working, needsReview, inFlight, quietlyFine)
- Each section item references an existing artifact (StrategyPlan, CFONarrative,
  ApprovalRequest) by id, plus a one-line system-voice description

**New pattern component:** `src/components/patterns/orientation-card.tsx`
- Top: one-sentence system summary ("Three things need you today. Paid social
  is the urgent one.")
- Sections rendered as collapsible blocks, top two open by default
- Each item: artifact icon, one-line description in marketer's language,
  authorship state indicator, primary action (Open / Review / Approve / Dismiss)
- "Why this is here" affordance reveals ranking rationale per item

**Generation logic:** `src/data/orientation-flow.ts`
- `buildOrientation(state)` inspects savedStrategies, savedNarratives,
  approvalRequests, SEED_ANOMALIES, SEED_UPCOMING_DECISIONS and ranks items
- Ranking: anomalies first, then upcoming approvals, then in-flight drafts,
  then quiet items collapsed
- Re-generates on Home mount; cached for the session

**Home page integration:** `src/app/(app)/home/page.tsx`
- On mount: if savedStrategies.length > 0 OR savedNarratives.length > 0,
  render Orientation artifact in main canvas
- Otherwise render existing welcome/getting-started state
- Dismissible to empty-state with chat input

**Out of scope for 8D:**
- Real anomaly detection — anomalies come from SEED_ANOMALIES
- Multi-user orientation (each persona sees their own scoped items — handled
  by existing persona context, no new logic)

---

### 8E — Decision-memory provenance variant (PRIORITY 3, SMALL)

Demonstrates collective intelligence surfacing into a single user's
experience. Slide 21 of the deck made visible.

**Type extension (`src/types/campaign.ts`):**
- Extend `ProvenanceSource` union with two values:
  `"platform_signal" | "comparable_situations"`

**UI treatment:**
- Provenance popover renders these sources with a distinct visual treatment
  (e.g., small "Platform learning" pill, icon)
- Reasoning text format: "Based on N comparable situations across the
  platform. Confidence: high."

**Usage:**
- One section in CFO Narrative attribution uses `"platform_signal"`
- One section in StrategyCard audience or bidding uses `"comparable_situations"`
  in the seed strategy
- Single demo instance per artifact type is enough — don't over-apply

---

### 8F — MCP entry-point demo path (PRIORITY 4, MOSTLY DECORATIVE)

Stubbed cross-platform handoff demo. Demonstrates Tier 1 item 1.1 from the
deck without building a real MCP server.

**New route:** `src/app/(marketing)/demo/mcp/page.tsx`
- Renders a fake Claude.ai-style conversation showing a marketer asking
  Claude for help with Q3 budget allocation
- Claude "calls FuseIQ" — animated tool-call indicator
- Returns a stubbed Strategy Recommendation Card (lighter than full
  StrategyCard)
- Primary CTA: "Continue in AdRoll" → routes to `/signup?source=mcp`

**Signup integration:** `src/app/(marketing)/signup/page.tsx`
- If `source=mcp` query param present, show a one-line acknowledgment in
  the signup form: "Your draft from Claude is ready. Sign up to activate."
- On signup completion, seed a pre-populated draft StrategyPlan with the
  Q3 budget recommendation, status `draft`, in the new user's
  savedStrategies

**Out of scope for 8F:**
- Real MCP server implementation
- Real Claude API integration on the demo page (this is a stubbed UI)
- Authentication beyond existing localStorage user object

---

### 8G — /about route on the prototype (PRIORITY 5, SMALL)

Makes the dual purpose legible to any visitor.

**New route:** `src/app/(marketing)/about/page.tsx`
- One-page explanation: what the prototype is, who built it, what design
  framework it implements
- Links: cynthiairani.design, FuseIQ Design Principles (Drive link or
  inline summary), the 2025 Pattern Framework Loom
- Linked from the marketing landing page footer and the (app) left-rail
  footer

---

### 8H — Scenario picker on first visit (PRIORITY 6, SMALL)

Marketing-style entry option, separate from the dev-only persona switcher.

**New component:** `src/components/marketing/scenario-picker.tsx`
- Renders on `/home` for first-time users (no savedStrategies in localStorage)
- Two scenarios:
  - "Plan a campaign from scratch" — empty state, opens chat fullscreen
  - "See the Monday morning briefing" — pre-seeds Norwest Analytics state
    from SEED_PERFORMANCE + SEED_ANOMALIES, renders Orientation artifact
- Choice persisted to localStorage `fuseiq-scenario`
- After selection, scenario picker doesn't reappear (existing flow takes over)

---

## Build order

1. **8C** CFO Narrative artifact (highest value, both audiences)
2. **8D** Orientation artifact (depends on 8C narratives existing in state)
3. **8E** Decision-memory provenance variant (small, can interleave with 8C/8D)
4. **8H** Scenario picker (enables clean first-visit demo)
5. **8F** MCP entry-point demo (decorative but high signal for FuseIQ audience)
6. **8G** /about route (smallest, ship last)

## What stays untouched

- Existing personas (Sarah Chen B2C, Marcus Patel VP, Jordan Reyes client)
- Single-advertiser model (savedAdvertisers upsert pattern)
- Existing nav (Home, Campaigns, Audiences, Reports, Approvals, Settings)
- Chat mode selector (Assisted / Conversational)
- Input-richness routing in getNextStrategyTool()
- Existing StrategyCard, PlanCard, ApprovalReviewCard
- localStorage persistence model
- AICompanionContext four states (resting / fullscreen / docked / split)

## Verification

For each item:
1. `npx tsc --noEmit` — clean
2. `npm run build` — succeeds
3. Browser test from cold-start localStorage:
   - 8C: Create narrative from seed → renders in canvas → save to nav →
     reload → reopens from Reports nav → export to PDF works
   - 8D: Choose "Monday morning briefing" scenario → orientation renders →
     tapping an item opens the referenced artifact → dismiss works
   - 8E: Provenance popover on flagged sections shows platform-signal
     treatment
   - 8F: /demo/mcp renders → "Continue in AdRoll" routes correctly →
     signup with source=mcp seeds the draft strategy
   - 8G: /about renders, links work
   - 8H: First visit shows picker, second visit does not
4. Persona switching: each persona sees correct scoped items in
   orientation and narratives

## Out of scope for Phase 8 entirely

- Real MCP server
- Real attribution math
- Real ad serving
- New nav items
- Restructuring existing data model beyond the additions above
- Mobile responsive design
- Accessibility audit (deferred to polish)
- Server-side persistence

Phase 9 (see `PHASE-9.md`) captures the North Star follow-ups from the
2026-05-29 ELT demo. Phase 10 is polish, copy refinement, and the Loom
recording — no new features.
