# Phase 9: North Star follow-ups (2026-05-29 ELT demo feedback)

**Source of truth:** CLAUDE.md is canonical. This extends the phase plan with
work surfaced in the May 29 conversational-experience demo to the ELT
(Hans Fischmann, Cathy Bergstrom, Evan Clark, Jay Webster).

**Outcome of that demo:** the prototype was confirmed as the **North Star
design direction** — the org will build AI-native from a clean slate rather
than retrofit the legacy system. The items below are the design / front-end
work that came out of the discussion. Backend/data items (data-stack
unification, proprietary SLM, anomaly model) are dependencies, not design-owned
— captured at the end for awareness.

**Principle:** every item stays artifact-first, evidence-grounded, and renders
from seed data. No real integrations.

---

## Phase 9 items

### 9A — Competitive Intelligence surface (PRIORITY 1) — [Jay Webster]

The highest-signal ask in the room. On login, position the user immediately
against their market using public web data — and use it as a PLG hook that
drives pixel install (Cathy/Jay's second activation path).

**New artifact type (`src/types/campaign.ts`):**
- `CompetitiveBrief` — `id`, `name`, `advertiserId`, `generatedAt`, sections:
  `marketPosition`, `topCompetitors`, `messagingAngles`, `whereToWin`. Each
  follows the `StrategySection` schema (provenance, readiness, etc.).

**New pattern component:** `src/components/patterns/competitive-brief-card.tsx`
- Competitors table: name, est. traffic share, trend, primary channel
- Messaging-angle analysis: how competitors position vs where Ffern can win
- Provenance per claim: `"SimilarWeb + public web, {date}"` (simulated)

**Two PLG roles:**
1. **Instant cold-start value** — pulls *public* data, needs no pixel, so a
   net-new user sees value before connecting anything.
2. **Pixel-install driver** — primary CTA *"Track competitors continuously →
   connect your pixel"* makes the competitive tool the activation hook.

**Seed:** a `CompetitiveBrief` for Ffern vs Le Labo / Byredo / Diptyque /
Jo Malone / Aesop (already in the keyword seed). Add to `seed-returning.ts`.

**Suggested prompt:** "How am I positioned against competitors?"

**Out of scope:** real SimilarWeb API, real scraping, real Claude calls — all
mocked from seed. (Jay flagged the Claude + SimilarWeb integration as cheap +
powerful for the eventual real build; not this prototype.)

---

### 9B — PLG home: two activation paths + upsells (PRIORITY 2) — [Cathy Bergstrom, Hans Fischmann, Jay Webster]

Make the home an explicit PLG surface with the two paths the room aligned on.

**Cold-start home — two clear paths:**
- "Launch a campaign now" → fast time-to-revenue (existing build flow)
- "See who you're up against" → Competitive Intelligence (9A) → pixel install

**Returning home — recommended actions + upsells** keyed to setup/goals
(extend the existing priority cards with upsell framing):
- "Add CTV to your awareness campaign" (premium channel upsell)
- "Connect Shopify for product ads" (capability upsell)
- Each artifact-shaped, dismissible, with the reason shown.

**Out of scope:** real billing / upsell transactions; pricing UI.

---

### 9C — Agency onboarding: roles & permissions (PRIORITY 3) — [Hans Fischmann]

Hans called out that PLG onboarding works for small shops, but larger agencies
need a different module with roles and permissions.

- Add a path selectable at signup/first-run: **"I'm an agency"** → multi-client,
  multi-seat framing.
- Surface role context in the UI — Operator (builds), Approver (reviews),
  Client-viewer (read-only) — mapped to the **existing personas** (Sarah /
  Marcus / Jordan) and the existing approval system. Simulated, no real RBAC.
- Show "who can do what" affordances on artifacts (e.g., a viewer sees Approve
  disabled with a tooltip).

**Out of scope:** real auth / RBAC / seat management. Simulated roles only.

**DONE — per-client scoping (9C.2):** The agency now manages many SMB workspaces.
A **client switcher in the left rail** (`client-switcher.tsx`) lets the agency
enter any client; the whole app then scopes to that client (the exact SMB
dashboard — "Welcome back", their KPIs, campaigns, audiences, reports), with
"← All clients" to return to the Brainlabs portfolio. Mechanism: an
`fuseiq-active-client` localStorage scope read by `getCurrentBrand()` (overrides
brand resolution) + `ensureReturningSeed()` (seeds that client's workspace);
entering/exiting clears the shared workspace keys and full-reloads so every
context re-hydrates against the new scope. Portfolio roster cards and the rail
switcher stay in sync (both call `enterClient`/`exitClient`). *v1 limitation:
switching clients reseeds — per-client edits don't persist across switches; and
a client's performance numbers use the generic seed (not brand-specific).*

---

### 9D — AI-execution vs manual-control choice (PRIORITY 4) — [Cynthia Irani / customer test]

The question Cynthia wants to put in front of customers: do users prefer the AI
*running the task* or *manual control*? Make that fork explicit so the test can
measure it.

- At key decision points, offer a clear choice: **"Let the AI run this"**
  (Operator pattern — agentic execution within budget / frequency / scope
  guardrails) vs **"I'll drive"** (manual / Plan).
- Promote the Operator pattern to a first-class, visible choice rather than a
  buried mode. Show the guardrails the user is granting.
- Built to be the thing customers react to in the upcoming test.

**Out of scope:** real autonomous execution — operator runs are simulated.

---

### 9E — Window-management robustness (PRIORITY 5, polish) — [live demo bug]

The floating-window drag/resize errored live during the demo (the "extreme"
features). Make it demo-solid.

- Verify floating drag + 8-direction resize against viewport bounds: clamp,
  no NaN geometry, clean persist/restore.
- Document and prevent the dev-only `.next` hydration gremlin: never run
  `npm run build` against the live dev server; clean-restart procedure is
  stop dev → `rm -rf .next` → `npm run dev`.

**Out of scope:** new window features.

---

### 9F — Real-data seam (PRIORITY 6) — [Cynthia Irani, Evan Clark]

Cynthia + Evan are meeting to rig the prototype with real data. Front-end job
is to make that a data-layer swap, not a component rewrite.

- Ensure every surface reads through the seed/data layer (`seed-company`,
  `seed-ffern`, `seed-returning`, `prerequisites` capabilities) behind clean
  accessors.
- Document the data contract each surface needs (shape Evan's team fills).

**Out of scope:** the actual integration (Evan's data team + unified stack).

---

## Build order

1. **9A** Competitive Intelligence (highest exec signal; unlocks 9B path 2)
2. **9B** PLG home paths + upsells (depends on 9A for path 2)
3. **9D** AI-vs-manual choice (drives the customer test)
4. **9C** Agency roles & permissions
5. **9E** Window robustness (interleave; small)
6. **9F** Real-data seam (ongoing, pairs with Evan)

---

## Dependencies — NOT design-owned (tracked for awareness)

- **Unified data stack** (Iceberg/Hive), federated-query + semantic-layer
  performance — Evan Clark / Jay Webster. Blocks real agentic features.
- **Proprietary marketing SLM** ("speak marketing") — new data-science team.
- **Anomaly-detection model** (backend) — front-end surface already mocked from
  `SEED_ANOMALIES`; real model is a backend dependency.
- **ICP definition** — strategy (Jay).

## Explicitly NOT doing

- **Dark mode** — decided against in the meeting; the primary persona is the
  marketer, not coders (Cynthia, confirmed live).

---

Phase 10 is polish, copy refinement, and the Loom recording. No new features.
