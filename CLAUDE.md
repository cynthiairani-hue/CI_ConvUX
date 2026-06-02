# FuseIQ — AI-native marketing platform prototype

A working prototype of an AI-native B2B marketing platform. It demonstrates a
set of interaction principles for AI-assisted marketing software: two modalities
(manual GUI + AI chat) producing one artifact system, artifact-first AI output,
evidence shown before persuasion, progressive readiness states, an explicit
Build → Approve → Activate lifecycle, and a Notice → Propose → Authorize agent
loop. Data is mocked; there is no real ad-serving or customer data.

## Stack

- Next.js 14 (App Router) — route groups `(app)` (authenticated) and
  `(marketing)` (public)
- TypeScript (strict), Tailwind CSS, shadcn/ui primitives, Lucide icons
- React Context for state (AICompanion, Campaign, Layout, Persona)
- localStorage for persistence (no backend DB)
- Anthropic API via `/api/chat` for chat responses
- Optional: Cube Cloud semantic layer via `/api/cube` (env-gated, local dev only)

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npx tsc --noEmit   # type-check
```

> Don't run `npm run build` while `next dev` is running — it clobbers `.next`.
> Procedure: stop dev, `rm -rf .next`, build, then restart dev.

## Optional real data (Cube)

Copy `.env.example` → `.env.local` and set `CUBE_API_URL` + `CUBE_API_TOKEN`
(plus the measure/dimension names). Absent those, the app falls back to mock
data everywhere. `.env.local` is gitignored and never deployed.

## Architecture

Three regions: a collapsible **left rail** (Home, Campaigns/Media Plans,
Audiences, Reports, Approvals), a **main canvas** that renders the current
surface and its artifacts, and a persistent **AI companion** with four layout
states (fullscreen, split, floating, resting).

Personas (dev-only switcher): an SMB marketer and an agency marketer (a B2B/ABM
persona exists but is not the current focus). The agency persona manages many
client workspaces and builds **media plans**; the SMB persona builds
**campaigns**.

## Key conventions

- Use system color tokens (`bg-foreground`, `text-muted-foreground`, `border`,
  `bg-muted`, etc.); avoid custom hex when a token exists. Color carries meaning
  (status/readiness/accent/data-viz), not decoration.
- Reuse existing components/patterns (StrategyCard, MediaPlanCard, ConfirmDialog,
  CardOverflowMenu) rather than reinventing.
- **Asking the user to decide or act = the `ChatChoices` card. Never invent
  chips/buttons.** Any time the AI offers next steps, asks the user to pick, or
  proposes an action to authorize (Notice → Propose → Authorize), render it as a
  `choices` tool call (single-select radio, or `multiSelect` checkboxes for
  several-at-once) — the same card used for budget/objective steps. It comes with
  "Something else" free text and Skip for free. Wire the choice to a real flow via
  a `field` handler in `submitChoice`; **never offer an option the system can't
  actually perform.**
- TypeScript strict, no exceptions.
- Artifacts are first-class objects (one source of truth in context + localStorage),
  not trapped in chat. Editing in either modality updates the same artifact.
- Main "build" CTAs open the editable artifact GUI on the canvas (no chat); the
  AI is reachable via the bottom-right bubble.

## Key directories

- `src/app/(app)/*` — authenticated pages (home, campaigns, audiences, reports, approvals, settings)
- `src/components/patterns/*` — artifact cards (strategy-card, media-plan-card, …)
- `src/components/layout/*` — app-shell, left-rail, canvases
- `src/components/ai-companion/*` — chat surfaces
- `src/contexts/*` — the four context providers
- `src/data/*` — flows, seeds, mock generators
- `src/lib/*` — storage, utils, cube client/adapter
- `src/types/campaign.ts` — the type system (StrategyPlan, MediaPlan, …)
