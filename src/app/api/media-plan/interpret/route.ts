import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

/**
 * LLM brief interpreter for the agency media-plan flow.
 *
 * The conversation is now intelligent (Claude reads the brief and extracts a
 * structured interpretation), but the PLAN MATH stays deterministic — the
 * client builds the plan from this interpretation anchored to the client's real
 * data. So: smart understanding + trustworthy, demo-safe numbers.
 *
 * Returns a JSON interpretation; falls back to safe defaults if anything fails,
 * so the build never breaks.
 */
export const runtime = "nodejs";

interface Interpretation {
  objective: "sales" | "awareness" | "traffic" | "leads" | "retargeting";
  weighting: "conversions" | "balanced" | "awareness";
  totalBudget: number; // flight total in USD; 0 if unspecified
  flightDays: number; // default 90
  goalConversions: number | null;
  goalRoas: number | null;
  summary: string; // 1–2 sentences, confident plain voice, reflects THIS brief
  assumptions: string[]; // things inferred because the brief didn't say
  missing: string[]; // genuinely unspecified things worth flagging
}

const FALLBACK: Interpretation = {
  objective: "sales",
  weighting: "conversions",
  totalBudget: 0,
  flightDays: 90,
  goalConversions: null,
  goalRoas: null,
  summary: "",
  assumptions: [],
  missing: [],
};

const SYSTEM = `You are a senior media planner at a performance agency. Read the client brief and return ONLY a JSON object (no prose, no code fences) with this exact shape:
{
  "objective": "sales" | "awareness" | "traffic" | "leads" | "retargeting",
  "weighting": "conversions" | "balanced" | "awareness",
  "totalBudget": number,        // the FLIGHT total in USD. 0 if the brief gives no budget.
  "flightDays": number,         // infer from the flight/duration; default 90.
  "goalConversions": number|null,
  "goalRoas": number|null,
  "summary": string,            // ONE confident sentence reflecting THIS brief's specifics (goal, budget, channels). No fluff, no greeting.
  "assumptions": string[],      // things you inferred because the brief didn't state them (short phrases)
  "missing": string[]           // genuinely unspecified things worth confirming (short phrases); [] if the brief is complete
}
Rules:
- If the brief states a conversion/ROAS goal, weighting is "conversions" and objective is "sales" unless it clearly says otherwise. Do NOT ask about weighting when the brief already implies it.
- Be decisive: prefer inferring a sensible default (and listing it under "assumptions") over leaving things blank.
- summary must be specific to the brief (e.g. mention the budget, the goal, the named channels), not generic.`;

function getClient(): Anthropic {
  const apiKey = process.env.FUSEIQ_ANTHROPIC_KEY;
  if (!apiKey || apiKey === "your-key-here") throw new Error("FUSEIQ_ANTHROPIC_KEY not set");
  return new Anthropic({ apiKey });
}

export async function POST(request: NextRequest) {
  let brief = "";
  let clientName = "the client";
  try {
    const body = await request.json();
    brief = typeof body?.brief === "string" ? body.brief : "";
    clientName = typeof body?.clientName === "string" && body.clientName ? body.clientName : "the client";
  } catch {
    return NextResponse.json(FALLBACK);
  }
  if (!brief.trim()) return NextResponse.json(FALLBACK);

  try {
    const client = getClient();
    const res = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 600,
      system: SYSTEM,
      messages: [
        { role: "user", content: `Client: ${clientName}\n\nBrief:\n${brief}` },
      ],
    });
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    // Strip code fences if present, then parse the first {...} block.
    const json = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const match = json.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : json) as Partial<Interpretation>;
    return NextResponse.json({ ...FALLBACK, ...parsed });
  } catch {
    // Never break the build — fall back to safe defaults (the client-side
    // deterministic parse + anchor still produce a valid plan).
    return NextResponse.json(FALLBACK);
  }
}
