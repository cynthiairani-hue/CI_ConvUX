# Competitive teardown: iCustomer "Super Agent" (Audience Loop)

**Observed:** 2026-05-29, live session at `aloop.icustomer.ai` · SMB tier.
**Basis:** observable behavior of the product's conversational agent — not
internal access. Architectural claims are inferences from how it responds, and
are flagged as such.

---

## TL;DR — the wedge

iCustomer's Super Agent is a capable **conversational destination with memory
and multi-agent orchestration** — but it is **decoupled from the frontend**. It
remembers your conversation, yet it can't see what page you're on or what's on
your canvas, and it doesn't travel with you across surfaces.

> It told us directly: *"I don't have visibility into the specific UI layout of
> each page… I can't definitively say whether the chat panel appears on the
> Journey canvas."*

That single line is the gap. **"Persistent" there means memory, not presence.**
FuseIQ's thesis — an AI companion that follows the user, sees the active
artifact, and grounds every claim in evidence — is the better experience for
exactly this reason.

---

## What it does well

- **Strong domain Q&A + orchestration.** Fluent on journeys, nodes, lists,
  automations; surfaces suggested questions ("How do I create a journey?",
  "Show me my recent journey runs").
- **Conversation memory persists** across navigation within a session.
- **Multi-agent system.** Named sub-agents/"twins" (response signed
  *"DIA · MOPS TWIN"*; nav exposes iAgents, Skills, Tools, Connectors,
  Orchestration → Now Running / Playbooks / Activations). There's real depth in
  the agent layer.
- **Honest failure.** When it can't answer, it says so rather than hallucinating
  a definitive UI claim — decent calibration, even if the answer is vague.

## The architectural tells (decoded from behavior)

1. **No frontend / UI grounding.** It cannot answer "what page am I on?",
   "what's on my canvas?", or even confirm its own presence on a page. → The
   agent is a backend service with domain tools, blind to client state.
2. **"Persistent" = memory, not presence.** It keeps conversational context as
   you navigate, but the chat lives in its own destination ("Super Agent" nav
   item) — it is not embedded on every surface. This is why you can't see it on
   the Journeys page.
3. **Chat-as-a-room, not companion.** The interaction model is "go to the agent
   and ask," then return to your work — a separate place, not an ambient layer
   over the work itself.
4. **Advisory-leaning.** Much of the value is explaining and guiding; the degree
   of in-context *execution* (write actions on the artifact you're viewing) is
   limited by #1 — it can't act on what it can't see.

## Where FuseIQ wins (point by point)

| iCustomer Super Agent | FuseIQ |
|---|---|
| Persistent **memory** | Persistent **presence + context** — companion follows the user across surfaces |
| Blind to UI/canvas state | **Artifact- and canvas-aware** — knows the active strategy, page, and readiness state |
| Chat is a **destination** | Chat is an **ambient layer** (fullscreen / split / floating) over the work |
| Answers in prose | **Artifact-first** outputs — reviewable, editable, persistent |
| Thin provenance | **Evidence before persuasion** — source, confidence, freshness on every claim |
| "Navigate over there and check" | Never needs to — it already sees what you're looking at |

## The headline gap

An AI that **doesn't know what you're looking at can't be truly contextual.**
iCustomer's agent has to tell the user to go look for itself. FuseIQ's companion
is architecturally incapable of needing to say that — which is the difference
between a chatbot bolted onto SaaS and an AI-native surface.

**One-line positioning:** *"Persistent" should mean present and context-aware
everywhere — not just that it remembers your text.*

---

## Caveat

This is a read of **observable behavior in one session**, not a claim about
iCustomer's internals. They may ship frontend grounding or an embedded companion
later; the teardown reflects the experience as it behaved on the date above.
