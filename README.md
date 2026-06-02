# FuseIQ — AI-native marketing platform prototype

A working prototype of an AI-native B2B marketing platform: two modalities
(manual GUI + AI chat) producing one artifact system, artifact-first AI output,
evidence shown before persuasion, progressive readiness states, an explicit
Build → Approve → Activate lifecycle, and a Notice → Propose → Authorize agent
loop. All data is mocked — no real ad-serving or customer data.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

- `npm run build` — production build (stop `next dev` first; it shares `.next`)
- `npx tsc --noEmit` — type-check

## Demoing

Use the persona switcher (bottom-left) to demo as:

- **Agency marketer** — manages multiple client workspaces; builds **media plans**
  (brief → plan → approve → activate). Enter a client from the rail switcher to
  scope the whole app to them.
- **SMB marketer** — builds **campaigns** through a guided/conversational flow.

Most build CTAs open the editable artifact directly on the canvas; the AI is
reachable via the bottom-right bubble. You can also edit any plan in chat
("change CTV budget to 12,000", "shift $10k from DOOH to social").

## Optional: real data via Cube

Copy `.env.example` → `.env.local` and set `CUBE_API_URL`, `CUBE_API_TOKEN`, and
your measure/dimension names. Without these, the app uses mock data everywhere.
`.env.local` is gitignored and never deployed.

## Stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind · shadcn/ui · Lucide ·
React Context + localStorage · Anthropic API (`/api/chat`).

See `CLAUDE.md` for architecture and conventions.
