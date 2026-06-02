# FuseIQ — Backlog

Parked items (not in the current focus). Current focus: **pick a client → build a
media plan**, perfected to match the real agency workflow.

## AI-native client onboarding (net-new path)
Make the "New client" path conversational + AI-driven instead of instantly
creating a record from the domain string.
- Trigger both ways: chat ("onboard represent.com" / "add our new DTC skincare client")
  and the GUI "New client" field.
- AI discovers → proposes a **client profile card** (logo, industry, competitors)
  → user **Confirms to add** (Notice → Propose → Authorize; evidence-first).
- Reuse the signup brand-discovery flourish for the "pulling brand…" beat.
- "From your book" stays a fast GUI multi-select (no AI needed).

## Per-client chat persistence
Today chats live in one `fuseiq-chat-sessions` bucket that's wiped on every client
switch (it's in `WORKSPACE_KEYS`). Namespace per scope
(`fuseiq-chat-sessions::client-vans`, `::portfolio`) so each client's conversations
persist and reappear when you return. Pair with left-rail "Recent" showing that
client's history.

## In-house: Operator ("Run with AI") flow is confusing / half-baked
Clicking "Run with AI" on a strategy drops the user out of chat into the Operator
authorization canvas with no clear framing ("Launch it with AI"? what?). The entry
button + "Let the AI run my top campaign" suggested prompt are **hidden/disabled**
for now (app-shell.tsx, suggested-prompts.ts). When we return: clarify what the
Operator does, frame the entry, and keep the user oriented (don't silently swap canvas).

## Demo-safety: hide/disable half-baked entry points
Anything not fully baked should be hidden or disabled so a presenter never clicks a
dead-end mid-demo. In-house and Enterprise are labeled WIP / Coming soon. Do a focused
pass over the in-house returning flow to find + disable other rough edges (audit-style).

## Shopify-style live canvas fill ("Build it with me")
In the conversational build, have the AI visibly populate the canvas field-by-field
as it narrates, with the in-chat artifact card showing a confirm ✓ — like Shopify
Sidekick's "Help me add a product."
