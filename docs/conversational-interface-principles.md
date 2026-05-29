# The challenge of designing a product where the AI *is* the experience

## Context

AdRoll is a performance marketing platform used by thousands of mid-market brands and agencies. When I joined as Director of Product Design, the company was at an inflection point: AI capabilities had matured enough to fundamentally change what the product could do for marketers — but the product experience hadn't caught up.

The existing product was a collection of powerful but disconnected surfaces — campaign builders, dashboards, reports, audience managers, budget tools — each designed independently, none aware of each other in a way that matched how marketers actually work.

Marketers don't think in surfaces. They think in a weekly rhythm: What happened this week? Are we on track? What should we change? How do I explain this to my client? That rhythm cuts across every tool in the platform.

The challenge wasn't adding AI to an existing product. It was designing a system where AI is the connective tissue — where every surface, every decision, every workflow is mediated through a conversational interface that understands context, builds trust, and respects human agency.

This document captures the principles, patterns, and behavioral rules that govern how the conversational interface works in FuseIQ Vision — a working prototype that demonstrates these ideas in shippable code.

---

## The design problem — stated plainly

Most AI-powered products bolt a chatbot onto a traditional UI. The chat is an addon. The UI is the product. The two barely talk to each other.

This creates three specific failures:

1. **Context loss.** The user builds a campaign in the traditional UI, then asks the AI a question. The AI doesn't know what the user just built. The user re-explains. Trust erodes.

2. **Output trapped in conversation.** The AI generates a good recommendation. It lives in a chat bubble. The user can't edit it, share it, find it later, or put it through an approval workflow. The output dies when the chat scrolls.

3. **All-or-nothing interaction.** The user either works in the traditional UI (no AI help) or works in the chat (no structured UI). There's no fluid movement between modes.

FuseIQ solves these by treating conversation and canvas as two views of the same system — not two separate systems wired together.

---

## Approach: Designing at the contract layer

The core architectural decision: **every AI output is a structured artifact, not prose.**

When the AI recommends a campaign strategy, it doesn't write a paragraph. It produces a `StrategyPlan` — a typed object with 7 required sections, each carrying provenance metadata (where the data came from), readiness state (ready, limited, or blocked), and authorship tracking (AI-proposed, user-decided, or edited).

This is the contract layer. The artifact schema is the agreement between the AI and the human about what decisions need to be made, what evidence supports them, and what state they're in.

### Why this matters for the conversational interface

The conversation is not the product. The artifacts are the product. The conversation is one of two ways to create, inspect, and modify artifacts. The canvas is the other.

This means:
- A strategy built in chat appears on the canvas. Editing it on canvas updates it everywhere.
- A strategy built on canvas can be discussed in chat. The AI sees the same artifact the user sees.
- The conversation is ephemeral. The artifact is persistent. Closing the chat doesn't lose work.

---

## The interaction model

### Two modalities, one artifact system

The user can work through conversation or through a visual canvas. Both produce the same artifacts. Both can modify the same artifacts. The container changes; the artifact doesn't.

**Conversation mode** is for exploration, iteration, and open-ended questions. "What should my budget be?" "Compare TikTok and Meta." "Draft a CFO summary."

**Canvas mode** is for structured review, editing, and approval. The strategy card on canvas shows every section, every readiness indicator, every provenance trail. It's the artifact in its full form.

The user moves between modes freely. Chat-first on entry, split-view when artifacts appear, canvas-only for focused review, floating chat for quick questions while working.

### Chat-first entry

The conversational interface is the entry point to the product, not a sidebar. On first visit, the user sees a text input — not a dashboard. The AI is the front door.

This is deliberate. New users don't know what the product can do. A dashboard full of empty states teaches nothing. A conversation starts a relationship.

### Auto-split on artifact output

When the AI produces a complete artifact (a strategy card, a performance narrative, an audience segment), the layout automatically splits: chat panel on the left (40%), canvas on the right (60%).

The user didn't ask for this layout change. The system recognized that the output has a structured form that deserves its own space. The chat persists so the user can continue iterating.

### Four layout states

The interface has four states, controlled by the user:

| State | Behavior |
|-------|----------|
| **Resting** | Chat hidden. Canvas only. A floating bubble provides access to chat when an artifact is visible. |
| **Fullscreen** | Chat takes over the entire viewport. Used for open-ended exploration before any artifact exists. |
| **Split** | Chat panel left, canvas right. The working state for iterating on artifacts through conversation. |
| **Floating** | Draggable chat window over the canvas. For quick questions while reviewing artifacts. |

A `ChatLayoutPicker` dropdown in every chat header lets the user switch between modes. The system remembers the user's preference via localStorage and restores it on return.

### Layout state persistence rules

- Only `split` and `floating` persist to localStorage. `Resting` is transient — it's the absence of chat, not a preference.
- Navigation clears active artifacts and converts `split` → `floating` so the destination page renders properly.
- Opening an artifact never changes the chat's layout state. If the user is in floating mode, they stay in floating mode.

---

## Notice → Propose → Authorize

Every AI-initiated action follows this three-step loop. Each step is observable in the UI.

### Notice

The AI detects a signal worth acting on.

Signals can be **user-initiated** (the user types a brief, clicks "Act on this") or **system-initiated** (the AI notices underperformance, creative fatigue, budget underspend, audience staleness).

System-initiated signals appear as priority cards on the home page — structured, dismissible, artifact-shaped. Never as interruptive alerts.

### Propose

The AI generates a structured artifact proposing the action.

The proposal is never a paragraph of prose. It's a Strategy Card, a Performance Narrative, a Change Summary — a typed object with sections, evidence, confidence levels, and readiness indicators.

The proposal shows its reasoning:
- What changed (the signal)
- What the AI recommends (the action)
- Why (the evidence — data points, confidence level, freshness)
- What's missing (readiness state: ready, limited, or blocked)

### Authorize

The user explicitly decides: **Approve, Edit, Reject, or Ask for more info.**

Authorization is never implicit. Even for low-stakes actions. The user always sees what they're committing to before they commit.

This is enforced architecturally through the `Build → Approve → Activate` status flow:
- `draft` → the artifact is being built
- `pending-approval` → sent to an approver, activation blocked
- `approved` → an approver signed off
- `active` → the user explicitly activated
- `paused` / `archived` → the user explicitly stopped or shelved

---

## Reactive by default, selectively proactive

The AI responds when asked. It interrupts only in four cases:

1. **High-confidence signals** — Performance data shows a clear, actionable problem (creative fatigue, budget pacing issue). Surfaced as a priority card, never an alert.

2. **Onboarding moments** — The user's first interaction. The AI guides through brand profile setup because every subsequent interaction depends on context.

3. **Quick clarification** — The user started an action and the AI needs one piece of information to avoid doing it wrong. A brief inline question, not a multi-step form.

4. **Workflow completion** — The user started a workflow (e.g., built a strategy but didn't save it). The AI offers to finish it.

Proactive nudges are always:
- **Artifact-shaped** — structured cards, not text alerts
- **Dismissible** — the user can ignore them without consequence
- **Evidence-backed** — they show why the AI is surfacing this now
- **Rare** — a proactive nudge that fires every session loses its signal value

---

## Evidence before persuasion

Every recommendation shows its evidence inline. The user never takes the system's word for anything.

### Evidence structure

Recommendations carry three metadata dimensions:

| Dimension | Example |
|-----------|---------|
| **What changed** | "CTR dropped 12% in 7 days" |
| **Confidence** | "92% confidence — based on 14 days of data" |
| **Freshness** | "Refreshed 3 hours ago" |

### Evidence voice patterns

The AI states what it knows and what it doesn't:

> "Increase Display 20% — 14 days of data, 92% confidence, refreshed 3 hours ago."

> "'Lead with the proof' outperforming by 2x. Confidence is low — only 1 conversion. Recommend waiting 24-48 hours."

> "I can't generate creative variations without your brand site. Want to connect it now?"

> "Audience has fewer than 1,000 seed records. Lookalike model needs 2,000. Audience in Limited state."

### Provenance tracking

Every section of every artifact tracks where its data came from:

| Source | Meaning |
|--------|---------|
| `user_input` | The user explicitly set this value |
| `ai_inferred` | The AI derived this from context or conversation |
| `brief_extracted` | Parsed from an uploaded brief or document |
| `default` | System default — needs user review |
| `previous_campaign` | Carried over from a prior campaign |

This provenance is visible in the UI. Each section shows an info icon that reveals the source, the reasoning, and the confidence level.

---

## Progressive readiness

Every artifact and every section within an artifact has one of three readiness states:

| State | Meaning | Visual treatment |
|-------|---------|-----------------|
| **Ready** | All required data present, validated, good to go | Green indicator |
| **Limited** | Functional but missing context that would improve quality | Amber indicator |
| **Blocked** | Cannot proceed without user input | Red indicator |

The experience works from cold start. A first-time user with no connected accounts, no brand profile, and no historical data can still build a campaign — but sections will show as Limited or Blocked until context is provided.

This replaces the binary "complete / incomplete" model. A Limited audience segment is still usable — the AI just can't be as precise.

---

## Artifact-first output

Every AI output is structured, reviewable, and persistent. Never a paragraph of prose.

### What "artifact-first" means in practice

When the user asks "Build me a retargeting campaign," the AI doesn't write a paragraph explaining what retargeting is. It produces a `StrategyPlan` with 7 sections:

1. **Objective** — What this campaign is trying to achieve
2. **Budget & Schedule** — Spend amount, duration, pacing
3. **Audience** — Who we're targeting and why
4. **Placements** — Which channels and formats
5. **Bidding** — Strategy and constraints
6. **Creative** — Ad formats and content direction
7. **Forecast** — Expected outcomes with confidence ranges

Each section is editable, independently. Each carries its own readiness state, provenance, and authorship tracking.

### Authorship tracking

Every section tracks who decided its current value:

| State | Meaning |
|-------|---------|
| `proposed` | AI generated this, user hasn't reviewed |
| `decided` | User explicitly accepted or set this value |
| `edited` | User modified the AI's proposal |
| `locked` | Approved and no longer editable without re-approval |

Sections in `proposed` state render with a dimmed "AI proposed — review" treatment. The user can see at a glance which parts of the artifact they've actively decided on vs. which are still AI defaults.

---

## Persistent memory

The AI remembers everything. Brand profile, advertiser info, connected platforms, previous selections, and conversation context carry across every interaction.

### What this means concretely

- If the user signed up as Ffern, every flow knows they're Ffern. No form asks "What's your company name?" again.
- If they already connected Google Ads, the platform connection step is skipped.
- If they just reviewed performance data, the campaign plan references those numbers.
- Chat sessions persist to localStorage. The user can return to any conversation and pick up where they left off.

### Cards are for decisions, not data entry

Selection cards appear when the user needs to choose between options. Forms appear only when the system truly has no information to pre-fill.

The advertiser setup form only appears for unknown brands with no profile match. Known brands skip straight to the first real decision.

---

## Input-richness routing

The campaign flow dynamically counts what's missing and only asks for what it doesn't know.

`getNextStrategyTool()` inspects the current state of the artifact and counts unfilled sections. The total step count reflects only what's actually needed — not a fixed sequence.

If the advertiser is known from context, skip the advertiser step. If keywords aren't relevant to the objective, skip keywords. If the user provided budget in their initial message, skip the budget step.

The flow feels short for users who provide rich input upfront, and longer for users who need guidance. Same flow, different paths.

---

## Two modes: Guided and Express

The user chooses how much hand-holding they want:

| Mode | Behavior |
|------|----------|
| **Guided** | AI walks through each decision step by step. Shows selection cards, explains trade-offs, asks for confirmation at each stage. Best for learning or complex decisions. |
| **Express** | AI fills in smart defaults immediately, produces the artifact, and lets the user edit what they disagree with. Best for experienced users who want speed. |

The mode persists to localStorage. The user's choice carries across sessions.

---

## The weekly operating rhythm

The home page morphs based on whether the user is new or returning.

### First-time user

Sees a clean entry point with a hero card ("Let's build your first campaign") and three secondary cards for exploration (see performance, connect accounts, plan spend). Every CTA opens the same conversational interface — the AI meets the user wherever they start.

### Returning user

Sees what matters this week:
- **Performance summary** — Revenue, ROAS, Spend, CPA with month-over-month change indicators and sparklines
- **Priority cards** — AI-surfaced actionable insights ranked by confidence and impact
- **Chat history** — Recent conversations grouped by topic, accessible from the home page input
- **Saved strategies** — Draft campaigns organized by advertiser

The transition from first-time to returning user happens automatically when the user saves their first strategy. No manual toggle. The system adapts.

---

## The capability readiness system

The system always tells the user what it can and can't do right now, and what would unlock more capability.

### Three states, always visible

| State | Example |
|-------|---------|
| **Ready** | "Audience segment built with 2,100 seed records. Ready for lookalike expansion." |
| **Limited** | "Performance report available but limited — only Google Ads connected. Connect Meta for full cross-channel view." |
| **Blocked** | "Cannot generate forecast — no historical campaign data. Run your first campaign to unlock forecasting." |

### Progressive unlock

Each capability tells the user what action would move it from Limited to Ready or from Blocked to Limited:

- Connect an ad account → unlocks performance reporting
- Save a brand profile → unlocks personalized recommendations
- Run a campaign for 7 days → unlocks forecasting
- Reach 1,000 seed records → unlocks lookalike audiences

This creates a natural onboarding gradient. The user sees value immediately (the AI can build strategies with zero data), and each action they take unlocks more sophisticated capabilities.

---

## Voice and tone

The AI speaks in plain English. Direct, calibrated, evidence-grounded.

### Voice rules

- **Never cheerful.** Not "Great question! I'd be happy to help!" but "Got it. Drafting a campaign plan for trial signups, $3K budget, 30 days."
- **Never apologetic.** Not "I'm sorry, I can't do that" but "That requires a connected ad account. Want to set that up now?"
- **Never marketing-y.** Not "Supercharge your campaigns with AI-powered insights!" but "Your Meta CPA rose 18% this week. Here's why and what to change."
- **Always calibrated.** The AI states its confidence. "High confidence — 14 days of data" vs. "Low confidence — only 2 conversions. Recommend waiting."
- **Always actionable.** Every observation comes with a next step. "CTR dropped 12%" is never the end of a sentence — it's "CTR dropped 12%. Recommend refreshing creative this week."

### Proactive nudges are artifact-shaped

Not: "Hey, I noticed your campaign is underperforming!"

But: A Performance Summary Card appears with the recommendation embedded, marked "AI suggestion — review and approve."

---

## Conversation session management

### Session persistence

Every conversation is automatically saved with metadata:
- Session name (auto-generated from first user message, editable)
- Topic group (inferred from keywords: campaigns, performance, creative, audiences, accounts, budgets, general)
- Timestamps (created, last active)
- Message count and token usage

### Session history

The chat header shows a conversation switcher dropdown with sessions grouped by recency:
- Today
- Yesterday
- This week
- Previous 30 days
- Older

Each session supports rename, archive, and delete actions. Switching sessions preserves the current session's state and loads the target session's full message history.

### Token transparency

Every conversation displays its token count in the header — a running tally of how much context the AI is working with. This builds trust by making the system's resource usage visible.

---

## Detail level selector

The user controls how much the AI shows its work:

| Level | Behavior |
|-------|----------|
| **Normal** | Standard responses. Evidence inline, reasoning implied. |
| **Thinking** | Shows progressive thinking steps before the response. The AI reveals its reasoning process — which data it checked, what it considered, what it decided. |
| **Verbose** | Maximum detail. Every data point, every trade-off, every alternative considered. |
| **Summary** | Concise, executive-level. Key numbers and recommendations only. |

The detail level persists across sessions. A CFO reviewing at Summary level sees the same artifact content as a media buyer at Verbose level — just with different amounts of supporting context.

### Thinking steps rendering

When detail level is set to Thinking or Verbose, the AI shows progressive thinking steps before delivering its response:

1. Steps appear one at a time with staggered 600ms delays
2. Each completed step shows a green checkmark
3. The active step shows a spinner
4. Steps are contextual — a CTV campaign shows different thinking steps than a retargeting campaign
5. The final response appears after all thinking steps complete

---

## Multi-user collaboration model

### Persona-aware system

The prototype supports multiple user personas, each seeing the system from their own perspective:
- The marketer builds and submits
- The VP reviews and approves
- The client comments and requests changes

### Approval workflow

The `Build → Approve → Activate` loop works across personas:

1. Marketer builds strategy in chat → saves as draft
2. Marketer clicks "Send for approval" → picks approver, adds context
3. System creates approval request → simulated Slack notification
4. Approver switches persona → sees pending approval in nav (badge count)
5. Approver reviews artifact, leaves comments → Approves / Requests Changes / Rejects
6. On approval → marketer can Activate
7. On rejection → artifact returns to draft with reviewer's comments attached

### Comment threads

Comments persist alongside the artifact. Both personas can comment. State survives across persona switches. Comments are part of the approval record — not trapped in chat.

---

## Markdown rendering in chat

Chat messages render with full markdown support to match the quality of tools like Notion:

- **Headings** (##, ###) for section structure
- **Bold** and *italic* for emphasis
- **Bullet lists** (- item) for unordered lists
- **Numbered lists** (1. item) for sequences
- **Tables** (| col | col |) for data comparison
- **Horizontal rules** (---) for section breaks
- **Inline code** (`code`) for technical terms

This rendering quality is essential because the AI's responses are substantive — they contain structured recommendations, data comparisons, and multi-section plans. Flat text would make these unreadable.

---

## What I learned

### The contract layer is the design

The most important design decision wasn't visual. It was the artifact schema — the typed structure that defines what a campaign strategy contains, what metadata each section carries, and what states it can be in. Get this right and the UI almost designs itself. Get it wrong and no amount of visual polish fixes the underlying confusion.

### Two modalities is harder than one

Supporting both conversation and canvas for the same artifacts means every state change must be reflected in both places. Every edge case doubles. But the payoff is significant — users who prefer chat get chat, users who prefer direct manipulation get canvas, and most users move between both depending on the task.

### Proactive AI is a trust budget

Every proactive nudge spends trust. If the AI interrupts with something unhelpful, the user's tolerance for future interruptions drops. The solution is to be stingy — only interrupt with high-confidence, high-impact signals, and always in artifact form (structured, dismissible, evidence-backed). A priority card the user ignores costs almost nothing. A popup alert the user dismisses costs trust.

### Evidence is the UI

In AI-native products, the evidence layer IS the user interface. Confidence levels, data freshness, provenance tracking, readiness states — these aren't metadata. They're the primary interface elements that let the user decide whether to trust the AI's output. Without them, the user is flying blind.

### Memory is the moat

An AI product that remembers nothing between sessions is a toy. An AI product that remembers everything — brand context, preferences, past decisions, connected data, conversation history — is an operating system for the user's work. Persistent memory is what turns a chatbot into a colleague.
