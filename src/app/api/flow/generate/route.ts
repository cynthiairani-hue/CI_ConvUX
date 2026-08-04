import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { FLOW_CATALOG } from "@/data/flow-templates";
import type { FlowDraft } from "@/types/orchestration";

/**
 * LLM workflow composer for chat-generated orchestration flows.
 *
 * Claude reads the user's automation ask and composes a trigger → condition →
 * action flow FROM THE FLOW CATALOG — the fixed vocabulary of things the
 * system can actually do (simulated, like every integration here). The model
 * parameterizes catalog entries with the ask's specifics (thresholds, plan
 * names, channels); it never invents a capability. Every action lands
 * unauthorized on the canvas — Notice → Propose → Authorize is enforced there.
 *
 * Returns { draft } or { draft: null } on any failure; the client falls back
 * to a scripted monitoring flow so the build never breaks.
 */
export const runtime = "nodejs";

const catalogList = (items: readonly { id: string; label: string }[]) =>
  items.map((i) => `  - ${i.id}: ${i.label}`).join("\n");

const SYSTEM = `You are the orchestration composer inside FuseIQ, an AI-native marketing platform. The user describes an automation in plain language; you compose it as a flow using ONLY the catalog below. Return ONLY a JSON object (no prose, no code fences) with this exact shape:
{
  "name": string,                 // short flow name, e.g. "CPA guardrail — Vans plan" (max 40 chars)
  "trigger": { "catalogId": string, "title": string, "detail": string },
  "condition": { "catalogId": string, "title": string, "detail": string } | null,
  "actions": [ { "catalogId": string, "title": string, "detail": string } ]   // 1 to 3 actions
}

CATALOG — every catalogId MUST be one of these:
Triggers:
${catalogList(FLOW_CATALOG.triggers)}
Conditions:
${catalogList(FLOW_CATALOG.conditions)}
Actions:
${catalogList(FLOW_CATALOG.actions)}

Rules:
- title: short imperative label (max 45 chars). detail: one sentence with the ask's SPECIFICS — thresholds, plan/channel names, timeframes. If the ask omits a threshold, choose a sensible one and state it plainly in the detail.
- Use a condition only when the ask implies one (a scope like "only while the campaign runs", a data minimum, budget guardrails). Otherwise null.
- Actions that change spend or pause delivery are fine — the user authorizes each action explicitly before the flow can activate. But NEVER invent an action outside the catalog; if the ask wants something the catalog can't do, choose post-notice and say in its detail what it stands in for.
- Voice: plain, direct, calibrated. No cheer, no marketing-speak.`;

interface RawNode { catalogId?: string; title?: string; detail?: string }
interface RawDraft { name?: string; trigger?: RawNode; condition?: RawNode | null; actions?: RawNode[] }

const ids = (items: readonly { id: string }[]) => new Set(items.map((i) => i.id));
const TRIGGER_IDS = ids(FLOW_CATALOG.triggers);
const CONDITION_IDS = ids(FLOW_CATALOG.conditions);
const ACTION_IDS = ids(FLOW_CATALOG.actions);

/** Validate the model's draft against the catalog; null if it doesn't hold up. */
function validate(raw: RawDraft): FlowDraft | null {
  const node = (n: RawNode | null | undefined, allowed: Set<string>) =>
    n && typeof n.catalogId === "string" && allowed.has(n.catalogId) &&
    typeof n.title === "string" && n.title.trim() && typeof n.detail === "string" && n.detail.trim()
      ? { title: n.title.trim().slice(0, 60), detail: n.detail.trim().slice(0, 240) }
      : null;
  const trigger = node(raw.trigger, TRIGGER_IDS);
  if (!trigger || typeof raw.name !== "string" || !raw.name.trim()) return null;
  const actions = (raw.actions ?? []).map((a) => node(a, ACTION_IDS)).filter((a): a is NonNullable<typeof a> => !!a).slice(0, 3);
  if (actions.length === 0) return null;
  return {
    name: raw.name.trim().slice(0, 48),
    trigger,
    condition: node(raw.condition, CONDITION_IDS),
    actions,
  };
}

export async function POST(request: NextRequest) {
  let ask = "";
  let clientName = "";
  try {
    const body = await request.json();
    ask = typeof body?.ask === "string" ? body.ask : "";
    clientName = typeof body?.clientName === "string" ? body.clientName : "";
  } catch {
    return NextResponse.json({ draft: null });
  }
  if (!ask.trim()) return NextResponse.json({ draft: null });

  try {
    const apiKey = process.env.FUSEIQ_ANTHROPIC_KEY;
    if (!apiKey || apiKey === "your-key-here") throw new Error("FUSEIQ_ANTHROPIC_KEY not set");
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 700,
      system: SYSTEM,
      messages: [
        { role: "user", content: `${clientName ? `Client: ${clientName}\n\n` : ""}Automation ask:\n${ask}` },
      ],
    });
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    const json = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const match = json.match(/\{[\s\S]*\}/);
    const draft = validate(JSON.parse(match ? match[0] : json) as RawDraft);
    return NextResponse.json({ draft });
  } catch {
    return NextResponse.json({ draft: null });
  }
}
