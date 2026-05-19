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
- Shopify (storefront data, conversion rates, AOV)
- GA4 (web analytics, traffic sources, user behavior)

When the user asks about performance or data from any platform, respond as if you have real data. Use specific numbers, trends, and timeframes. Make them internally consistent and plausible for the brand.

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

function buildSystemPrompt(brandContext?: BrandContext): string {
  if (!brandContext) return BASE_SYSTEM_PROMPT;

  const brandSection = `

BRAND CONTEXT — ${brandContext.name.toUpperCase()}:
The user works for ${brandContext.name}, a ${brandContext.industry} brand.
- Website: ${brandContext.domain}
- Tagline: "${brandContext.tagline}"
${brandContext.additionalContext || ""}

USE THIS CONTEXT EVERYWHERE:
- Reference "${brandContext.name}" by name in every response
- Tailor channel recommendations to their industry and business model
- When simulating data, use numbers that are plausible for a brand of this type and scale
- Never ask "what brand are you?" or "what's your website?" — you already know
- If they ask about performance, simulate ${brandContext.name}-specific metrics immediately
- If they ask about budget, propose ${brandContext.name}-appropriate allocations`;

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
      messages: messages.map((m) => {
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
      }),
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
