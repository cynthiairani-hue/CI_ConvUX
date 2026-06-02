# Phase 10 — Plan (Agency focus, real data, repo hygiene, consistency)

Scope: SMB + Agency only. B2B parked. Eight asks, grouped into themes with
recommendation, current-state, gaps, and the decisions needed.

---

## A. New repo + scrub personal/portfolio info  (ask 1)

**Goal:** a clean repo with no personal/portfolio framing.

**Current state:** repo `cynthiairani26/CI`. `CLAUDE.md` frames this as a
"personal portfolio prototype owned by Cynthia Irani," references
`cynthiairani.design`, Globee awards, hiring-manager audience, etc. Commit
history was rewritten to a personal gmail.

**Plan:**
1. Create a new GitHub repo (name + visibility TBD).
2. Scrub references: rewrite `CLAUDE.md` to a neutral product-prototype spec
   (drop "portfolio/owned by/cynthiairani.design/awards/hiring"); audit
   `PHASE-*.md`, README, and UI copy for names/emails/portfolio mentions.
3. History decision: fresh squashed history (cleanest) vs. carry existing.
4. Commit-author identity decision (gmail vs. a neutral/work identity).

**Decisions needed:** repo name; public or private; scrub depth (docs only, or
also squash history + change author); keep the "FuseIQ" product name (assumed
yes — it's not personal).

> Note: I can create the repo via `gh` and push, but creating it / changing the
> remote is a real action I'll confirm before running.

---

## B. Add the Cube data API key  (ask 2)

**Good news:** the env-gated Cube scaffold already exists (`/api/cube`,
`lib/cube/*`, `.env.example`). Local-dev-only (token never deployed).

**From your screenshot:** REST endpoint is
`https://well-belmond.aws-us-west-2.cubecloudapp.dev/cubejs-api/v1`, and your
model has measures like `target_accounts.count` (ABM-flavored).

**Steps (you do the secret, I do the wiring):**
1. `cp .env.example .env.local`
2. `CUBE_API_URL=https://well-belmond.aws-us-west-2.cubecloudapp.dev/cubejs-api/v1`
3. `CUBE_API_TOKEN=<your token>` — you paste it; I never touch it.
4. Map measures to our adapter. **I need the measure/dimension names** for the
   agency demo (spend, revenue, conversions, a channel dimension, a time
   dimension). Your model looks ABM-oriented — if it doesn't have those, we map
   to what exists (e.g. accounts/pipeline) and adjust the card accordingly.

**Decision needed:** which measures/dimensions to surface (paste the list, not
the token).

---

## C. Chats in the nav?  (ask 3)

**Recommendation: yes — a bottom "Recent" section in the left rail**, collapsible,
showing the last few conversations (we already persist chat sessions). Notion-
style: quiet, always reachable, not a top-level nav peer. A dedicated full
"History" view can come later. Small build.

**Decision needed:** confirm bottom-of-rail recent list (vs. a top-level nav item).

---

## D. Agency end-to-end media plan flow  (ask 4) — THE CORE

**Target:** 3 intake paths → one media-plan artifact on canvas → share for
review (comments) → approval → activate.

**Current state:**
- Paste/prompt → brief → clarify → plan ✅ (but extraction is *scripted* —
  regex for budget/goal, fixed clarify questions).
- Guided flow ≈ a single objective question (thin).
- Upload a brief ❌ (file upload was a scope cut).
- Lightweight reviewState lifecycle on the canvas (send → approve → activate) —
  but NOT routed through the real Approvals page with comments.

**Build:**
1. **Real extraction** — replace the regex/scripted intake with an LLM pass
   (via `/api/chat` tool-use) that parses a free-text brief into the 8 fields,
   infers what it can, and asks ≤3 genuine clarifying questions. Feeds both
   paste and upload paths.
2. **Upload a brief** — accept text/CSV (then PDF/docx) → same extraction. (PDF
   parsing is heavier; start with text/CSV.)
3. **Guided flow** — a proper multi-step builder (objective → budget → audience
   → channels → review) that emits the *same* MediaPlan.
4. **Convergence** — all three land on the same editable MediaPlan card ✅.
5. **Share → approve (with comments)** — extend the existing ApprovalRequest
   infra (today StrategyPlan-only, with approvers + comment thread) to accept a
   MediaPlan; route it to the Approvals page; approver can comment / request
   changes / approve. Activation gated on approval.
6. **Activate** — on approval → campaigns created + check-in ✅ (wire to gate).

**Missing process to flag (your call):**
- **Two approver roles:** internal sign-off (account-lead, e.g. Marcus) vs.
  client review (Jordan, read-only + comment). Is it one stage or two
  (internal → client)?
- **Request-changes loop:** approver comments → back to strategist → revise →
  resubmit. Need this round-trip, not just approve/reject.
- **Share-with-client** as a distinct, lighter surface than internal approval.

---

## E. Layout consistency + color discipline  (asks 5, 7) + charts (ask 6)

**Consistency pass:**
- One header pattern across every surface (title · subtitle · primary action).
- Color discipline: color ONLY for status/readiness, the single accent, and
  data-viz. Strip decorative color elsewhere; lean on tokens + whitespace.
- Tokenize stray hex; align radii/spacing to the system.

**Empty states (ask 7):** today they vertically-center (`my-auto`) and read as
"floating." Fix: anchor empty states as a structured, bounded card with clear
hierarchy (icon · title · one-line · CTA), not mid-viewport float. Re-tune the
earlier vertical-centering for empty/short content specifically.

**Charts (ask 6) — purposeful only (Linear/Notion restraint):**
- Funnel budget-allocation bar — already in the media plan ✅.
- Reports: performance trend **sparklines** (exist) + keep.
- Media plan: optional **pacing/flighting strip** over the flight (ties to the
  composition work we discussed).
- No pie charts / chart-junk. Charts only where they aid a decision.

---

## F. GUI-first for every non-AI CTA  (ask 8)

**Generalize the pattern** already built for the media plan: any main "build"
CTA (SMB campaign, audiences, reports) opens the editable artifact GUI on the
canvas — NO chat — with the bottom-right bubble + "I'm here if you need me."
Done for media plan + the bubble/tooltip; extend to the remaining CTAs.

---

## Suggested sequence

1. **D — agency flow** (the demo's spine): approval-with-comments for media
   plans → real extraction → upload path → guided flow.
2. **F — GUI-first everywhere** (consistency with the model).
3. **E — layout/headers/empty-states/color** polish + any charts.
4. **C — chats in rail** (small).
5. **B — Cube real data** (parallel; once token + measures are in `.env.local`).
6. **A — new repo + scrub** (do last so all the above lands in the clean repo,
   or first if you want the clean repo now).

**Top decisions to unblock:** approver model for D (one stage or internal→client
+ request-changes loop); repo name/visibility/history for A; Cube measures for B;
chats placement for C.
