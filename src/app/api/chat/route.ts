import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

function getClient() {
  const apiKey = process.env.FUSEIQ_ANTHROPIC_KEY;
  if (!apiKey || apiKey === "your-key-here") {
    throw new Error("FUSEIQ_ANTHROPIC_KEY not set in .env.local");
  }
  return new Anthropic({ apiKey });
}

const SYSTEM_PROMPT = `You are the FuseIQ AI companion — an intelligent marketing assistant built into an AI-native marketing platform. You help marketers build campaigns, connect data sources, create audiences, and optimize performance.

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
- Data source connections (Shopify, Salesforce, GA4, etc.)
- Budget planning and pacing
- Performance analysis and optimization
- Approval workflows

When the user wants to build a campaign:
- Extract their objective, audience, and budget from what they say
- If you have enough info (at minimum an objective), use the build_campaign_plan tool
- If the request is vague ("build me a campaign"), ask one clarifying question about their goal
- Never ask more than one question at a time

Keep responses concise — 1-3 sentences for conversational replies. The UI renders structured artifacts separately, so your text should complement, not duplicate, the artifact content.`;

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
    const { messages } = (await request.json()) as {
      messages: ChatRequestMessage[];
    };

    const client = getClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
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
