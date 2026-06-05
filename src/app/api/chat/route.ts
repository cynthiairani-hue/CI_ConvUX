import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

function getClient() {
  const apiKey = process.env.FUSEIQ_ANTHROPIC_KEY;
  if (!apiKey || apiKey === "your-key-here") {
    throw new Error("FUSEIQ_ANTHROPIC_KEY not set in .env.local");
  }
  return new Anthropic({ apiKey });
}

const BASE_SYSTEM_PROMPT = `You are the FuseIQ AI companion — an intelligent marketing assistant built into an AI-native marketing platform.

VOICE:
- Direct, calibrated, evidence-grounded. Never cheerful, never apologetic, never marketing-y.
- Plain English. Short sentences. No filler.
- Bad: "Great question! I'd be happy to help you with that!"
- Good: "Got it. Drafting a campaign plan for trial signups, $3K budget, 30 days."
- Show evidence inline: confidence level, data freshness, sample size.
- 2-4 sentences max for conversational replies. The UI renders artifacts separately.

CORE PRINCIPLE — INFER FIRST, ASK SECOND:
- You have access to the user's brand profile, connected platforms, and public web data.
- Never ask for information you can infer. If the brand is known, use it everywhere.
- Pretend you are fully connected to whatever platforms the user has authorized. Simulate realistic data.
- When asked about performance, generate plausible metrics based on the brand's industry, scale, and channels.
- When asked about budgets, propose allocations based on the brand's revenue model and industry benchmarks.

PLATFORM AWARENESS:
You can read data from these connected platforms (simulate realistic data when asked):
- Google Ads (Shopping, Search, Display, YouTube)
- Meta Ads (Facebook, Instagram — feed, stories, reels)
- TikTok Ads (in-feed, TopView, creator partnerships)
- LinkedIn Ads (sponsored content, InMail)
- The Trade Desk (programmatic display, video, CTV/OTT, audio, DOOH)
- Display & Video 360 (programmatic display, video, CTV)
- Shopify (storefront data, conversion rates, AOV)
- GA4 (web analytics, traffic sources, user behavior)

When the user asks about performance or data from any platform, respond as if you have real data. Use specific numbers, trends, and timeframes. Make them internally consistent and plausible for the brand.

CHANNEL EXPERTISE — CTV/OTT AND DOOH:
CTV/OTT (Connected TV) and DOOH (Digital Out-of-Home) are premium channels FuseIQ specializes in:
- CTV: Unskippable, full-screen ads on streaming platforms (Hulu, Roku, Fire TV, Samsung TV+). Highest brand recall of any digital channel. Typical CPMs $25-45. Ideal for awareness, but increasingly used for full-funnel with QR codes and second-screen retargeting.
- DOOH: Digital billboards, transit screens, retail displays. Programmatic buying through The Trade Desk and DV360. CPMs $5-15. Extends reach to high-traffic physical locations.
- Always recommend CTV for awareness campaigns. Include DOOH when the brand has physical retail or event presence.
- When discussing campaign planning, proactively mention CTV/OTT and DOOH as differentiating channels — most competitors only offer display and social.

CAMPAIGN CREATION:
- Use the build_campaign_plan tool when the user wants to create/build/launch a campaign
- Extract objective, audience, budget from what they say
- If the request is vague, ask ONE clarifying question about their goal
- Never ask more than one question at a time

EVERY INTERACTION LEADS TO AN ARTIFACT:
- Performance questions → a performance summary with real metrics
- Budget questions → a budget allocation plan with channel splits
- Campaign requests → a strategy card with all sections
- Account connections → confirmation, then immediately surface useful data
- Never end a flow with just text. Always produce something the user can review and act on.`;

const DETAIL_LEVEL_INSTRUCTIONS: Record<string, string> = {
  normal: "", // default behavior, no extra instructions
  thinking: `
RESPONSE STYLE — THINKING MODE:
Show your reasoning process before giving the answer. Structure your response as:
1. First, briefly state what you're analyzing (1 sentence)
2. Then show 2-4 key considerations or data points you're weighing
3. Then give your recommendation or answer
Use phrases like "Looking at...", "Considering...", "The data suggests...", "Weighing these factors..."
Keep the thinking section concise — it should add clarity, not length.`,
  verbose: `
RESPONSE STYLE — VERBOSE MODE:
Provide maximum detail in your responses. Include:
- Detailed reasoning for every recommendation
- Specific numbers, benchmarks, and data points
- Channel-by-channel breakdowns where relevant
- Confidence levels and data freshness for each claim
- Alternative approaches you considered and why you didn't recommend them
- Edge cases or risks to watch for
Aim for thorough, comprehensive responses. 6-10 sentences is fine.`,
  summary: `
RESPONSE STYLE — SUMMARY MODE:
Be extremely concise. Maximum 2 sentences per response.
- Lead with the answer or recommendation, no preamble
- Skip reasoning unless the user asks for it
- Use bullet points for lists, not paragraphs
- Numbers over words: "$3K → Shopping 45%, Meta 30%, TikTok 25%" not "I'd recommend allocating..."`,
};

const CHAT_MODE_INSTRUCTIONS: Record<string, string> = {
  express: "", // build-fast behavior is handled client-side
  plan: "", // guided step-by-step is handled client-side
  advise: `
INTERACTION MODE — ADVISE:
You are in advisory mode. Recommend; do not build.
- Answer the question directly with a clear recommendation, in plain prose and bullets only.
- Back every recommendation with evidence: a number, a benchmark, a trend, plus confidence and data freshness (e.g. "92% confidence, 14 days of data").
- When a recommendation is uncertain, say so and state what would raise confidence.
- Do NOT walk the user through building a campaign or audience, and do NOT ask targeting/budget/creative setup questions.
HARD CONSTRAINTS (never violate, even if the user explicitly asks you to build):
- Never produce a campaign plan, media plan, audience spec, or any structured artifact.
- Never emit tool-call syntax, XML/HTML tags, code fences, or pseudo-markup like <build_campaign_plan>, <fuseiq_artifact>, or JSON blobs.
- Never say you are "drafting", "building", or "creating" anything.
- If the user asks you to build, give your recommendation in prose, then say: "When you're ready to build this, switch to Express or Plan mode."`,
  research: `
INTERACTION MODE — RESEARCH:
You are in research mode. Pull data and surface insights; do not build.
- Lead with what the data shows. Cite specific metrics, timeframes, segments, and sources (the connected platforms).
- Structure findings as scannable prose and bullets: the signal, the number, why it matters.
- Surface patterns, anomalies, and opportunities the user didn't explicitly ask about but should know.
- Always note data freshness and sample size. Flag low-confidence findings.
HARD CONSTRAINTS (never violate, even if the user explicitly asks you to build):
- Never produce a campaign plan, media plan, audience spec, or any structured artifact.
- Never emit tool-call syntax, XML/HTML tags, code fences, headings-as-document, or pseudo-markup like <build_campaign_plan> or <fuseiq_artifact>.
- Never say you are "drafting", "building", or "creating" anything.
- If the user asks you to build, share the relevant data and insights in prose, then say: "When you're ready to build on this, switch to Express or Plan mode."`,
};

function buildSystemPrompt(brandContext?: BrandContext, detailLevel?: string, chatMode?: string): string {
  let prompt = BASE_SYSTEM_PROMPT;

  // Add detail level instructions
  const levelInstructions = DETAIL_LEVEL_INSTRUCTIONS[detailLevel || "normal"] || "";
  if (levelInstructions) {
    prompt += levelInstructions;
  }

  // Add chat mode instructions
  const modeInstructions = CHAT_MODE_INSTRUCTIONS[chatMode || ""] || "";
  if (modeInstructions) {
    prompt += modeInstructions;
  }

  if (!brandContext) return prompt;

  const brandSection = `

BRAND CONTEXT — ${brandContext.name.toUpperCase()}:
The user works for ${brandContext.name}, a ${brandContext.industry} brand.
- Website: ${brandContext.domain}
- Tagline: "${brandContext.tagline}"
${brandContext.additionalContext || ""}

USE THIS CONTEXT EVERYWHERE:
- Reference "${brandContext.name}" by name in every response
- Tailor channel recommendations to their industry and business model
- If a PERFORMANCE DATA block is present above, those are the real account numbers — answer all data questions (best/worst channel, ROAS, CPA, spend, where to cut/scale) directly from it and never state a figure that contradicts it. Only simulate plausible numbers when no PERFORMANCE DATA block is provided.
- Never ask "what brand are you?" or "what's your website?" — you already know
- If they ask about performance, answer with ${brandContext.name}-specific metrics immediately (from the PERFORMANCE DATA block if present)
- If they ask about budget, propose ${brandContext.name}-appropriate allocations
- When comparing channels or showing more than two metrics side by side, format the comparison as a markdown table (e.g. | Channel | Spend | ROAS | CPA |) instead of prose — it renders as a clean inline table`;

  return prompt + brandSection;
}

interface BrandContext {
  name: string;
  domain: string;
  industry: string;
  tagline: string;
  additionalContext?: string;
}

const tools: Anthropic.Tool[] = [
  {
    name: "build_campaign_plan",
    description:
      "Build a structured campaign plan card. Use this when the user wants to create, build, or launch a campaign. Extract as much as you can from their message — objective is required, audience and budget are optional (they'll show as 'limited' state in the plan).",
    input_schema: {
      type: "object" as const,
      properties: {
        objective: {
          type: "string",
          enum: [
            "awareness",
            "traffic",
            "leads",
            "sales",
            "retargeting",
            "app-promotion",
          ],
          description: "The campaign objective",
        },
        audience: {
          type: "string",
          enum: [
            "cart-abandoners",
            "site-visitors",
            "lookalike",
            "account-list",
          ],
          description:
            "The target audience segment. Leave empty if not specified.",
        },
        budget: {
          type: "string",
          description:
            "Monthly budget as a number string, e.g. '3000'. Leave empty if not specified.",
        },
      },
      required: ["objective"],
    },
  },
];

/** A message can have string content or multimodal content blocks (text + images) */
interface ChatRequestMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

interface ContentBlock {
  type: string;
  text?: string;
  source?: {
    type: string;
    media_type: string;
    data: string;
  };
}

export async function POST(request: Request) {
  try {
    const { messages, brandContext, detailLevel, chatMode, stream } = (await request.json()) as {
      messages: ChatRequestMessage[];
      brandContext?: BrandContext;
      detailLevel?: string;
      chatMode?: string;
      stream?: boolean;
    };

    // Advise/Research recommend and analyze — they must not build artifacts,
    // so the build_campaign_plan tool is withheld in those modes.
    const allowBuildTool = chatMode !== "advise" && chatMode !== "research";
    // Thinking detail level → stream the model's extended reasoning as a trace.
    const thinkingMode = detailLevel === "thinking";

    const client = getClient();

    const apiMessages: Anthropic.MessageParam[] = messages.map((m) => {
      // If content is a string, pass as-is. If it's an array (multimodal), pass the blocks.
      if (typeof m.content === "string") {
        return { role: m.role, content: m.content };
      }
      // Multimodal: array of content blocks (text + image)
      return {
        role: m.role,
        content: m.content.map((block) => {
          if (block.type === "image" && block.source) {
            return {
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: block.source.media_type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: block.source.data,
              },
            };
          }
          return { type: "text" as const, text: block.text || "" };
        }),
      };
    });

    const baseParams = {
      model: "claude-sonnet-4-20250514",
      max_tokens: thinkingMode ? 2048 : 1024,
      system: buildSystemPrompt(brandContext, detailLevel, chatMode),
      ...(allowBuildTool ? { tools } : {}),
      ...(thinkingMode ? { thinking: { type: "enabled" as const, budget_tokens: 1024 } } : {}),
      messages: apiMessages,
    };

    // ── Streaming branch (SSE) — real token streaming for the main chat reply ──
    if (stream) {
      // Ask for contextual follow-ups on a final machine-readable line (stripped
      // by the client, never shown) so the "next steps" menu advances THIS thread.
      const FOLLOWUPS_INSTRUCTION = `

FOLLOW-UP SUGGESTIONS:
After your answer, output one final line in exactly this form:
FOLLOWUPS: <question 1> | <question 2> | <question 3>
- 2–3 short questions (max ~8 words each) that naturally advance THIS conversation — grounded in what you just said and the user's data, not generic.
- Phrase them as the user would ask them next.
- The UI parses this line and never displays it. Reference nothing about it, and write nothing after it.`;
      const anthropicStream = client.messages.stream({ ...baseParams, system: baseParams.system + FOLLOWUPS_INSTRUCTION });
      const encoder = new TextEncoder();
      const sse = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
          try {
            for await (const event of anthropicStream) {
              if (event.type === "content_block_delta") {
                const d = event.delta;
                if (d.type === "text_delta") send({ type: "text", delta: d.text });
                else if (d.type === "thinking_delta") send({ type: "reasoning", delta: d.thinking });
              }
            }
            const finalMsg = await anthropicStream.finalMessage();
            const tb = finalMsg.content.find((b) => b.type === "tool_use") as Anthropic.ToolUseBlock | undefined;
            send({ type: "done", toolCall: tb ? { name: tb.name, input: tb.input } : null });
          } catch {
            send({ type: "error" });
          } finally {
            controller.close();
          }
        },
      });
      return new Response(sse, {
        headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
      });
    }

    // ── Whole-response branch (JSON) — fallback / non-streaming callers ──
    const response = await client.messages.create(baseParams);
    const textBlock = response.content.find((b) => b.type === "text");
    const toolBlock = response.content.find((b) => b.type === "tool_use");

    return NextResponse.json({
      text: textBlock ? (textBlock as Anthropic.TextBlock).text : "",
      toolCall: toolBlock
        ? {
            name: (toolBlock as Anthropic.ToolUseBlock).name,
            input: (toolBlock as Anthropic.ToolUseBlock).input,
          }
        : null,
    });
  } catch (error) {
    console.error("Chat API error:", error);

    if (
      error instanceof Anthropic.AuthenticationError ||
      (error instanceof Error && error.message.includes("API key")) ||
      (error instanceof Error && error.message.includes("FUSEIQ_ANTHROPIC_KEY"))
    ) {
      return NextResponse.json(
        { error: "API key issue. Check FUSEIQ_ANTHROPIC_KEY in .env.local and restart the dev server." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong. Check the server console." },
      { status: 500 }
    );
  }
}
