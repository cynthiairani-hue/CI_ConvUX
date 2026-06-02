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

## Shopify-style live canvas fill ("Build it with me")
In the conversational build, have the AI visibly populate the canvas field-by-field
as it narrates, with the in-chat artifact card showing a confirm ✓ — like Shopify
Sidekick's "Help me add a product."
