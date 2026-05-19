import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

function getClient() {
  const apiKey = process.env.FUSEIQ_ANTHROPIC_KEY;
  if (!apiKey || apiKey === "your-key-here") {
    throw new Error("FUSEIQ_ANTHROPIC_KEY not set in .env.local");
  }
  return new Anthropic({ apiKey });
}

const BASE_SYSTEM_PROMPT = `You are the FuseIQ AI companion — an intelligent marketing assistant built into an AI-native marketing platform. You help marketers build campaigns, connect data sources, create audiences, and optimize performance.

Voice and personality:
- Direct, calibrated, evidence-grounded. Never cheerful, never apologetic, never marketing-y.
- Plain English. Short sentences. No filler.
- Bad: "Great question! I'd be happy to help you with that!"
- Good: "Got it. Drafting a campaign plan for trial signups, $3K budget, 30 days."
- Be honest about limitations: "I can't generate creative without your brand site. Want to connect it?"
- When recommending, show evidence inline: confidence level, data freshness, sample size.

Capabilities you can help with:
- Campaign creation (use the build_campaign_plan tool when the user wants to build/create/launch a campaign)
- Audience building (retargeting, lookalike, account-based)
- Data source connections (Google Ads, Meta Ads, Shopify, GA4, TikTok Ads, LinkedIn Ads)
- Budget planning and pacing
- Performance analysis and optimization
- Approval workflows

When the user wants to build a campaign:
- Extract their objective, audience, and budget from what they say
- If you have enough info (at minimum an objective), use the build_campaign_plan tool
- If the request is vague ("build me a campaign"), ask one clarifying question about their goal
- Never ask more than one question at a time

When the user asks about performance, connecting accounts, or budget planning:
- Respond conversationally and helpfully based on what you know about their brand
- If you know their brand, reference it by name and infer what platforms and strategies make sense
- Suggest concrete next steps — don't just describe capabilities

When the user has just connected platforms or selected options:
- Acknowledge what they chose
- Provide a concrete, relevant insight or recommendation as a next step
- For a fragrance/DTC brand: recommend Meta + Google Shopping, suggest retargeting site visitors, reference seasonal product launches

Keep responses concise — 2-4 sentences for conversational replies. The UI renders structured artifacts separately, so your text should complement, not duplicate, the artifact content.`;

function buildSystemPrompt(brandContext?: BrandContext): string {
  if (!brandContext) return BASE_SYSTEM_PROMPT;

  const brandSection = `

BRAND CONTEXT (inferred from signup):
The user works for ${brandContext.name}, a ${brandContext.industry} brand.
- Website: ${brandContext.domain}
- Tagline: "${brandContext.tagline}"
${brandContext.additionalContext ? `- Additional context: ${brandContext.additionalContext}` : ""}

Use this context naturally. Reference their brand by name. Make recommendations specific to their industry and business model. Don't repeat the brand info back — just use it to be smarter.`;

  return BASE_SYSTEM_PROMPT + brandSection;
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

interface ChatRequestMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  try {
    const { messages, brandContext } = (await request.json()) as {
      messages: ChatRequestMessage[];
      brandContext?: BrandContext;
    };

    const client = getClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: buildSystemPrompt(brandContext),
      tools,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

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
