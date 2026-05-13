import type { CampaignPlan } from "@/types/campaign";
import type { ChoiceOption } from "@/components/ai-companion/chat-choices";

export interface CampaignIntent {
  objective?: string;
  audience?: string;
  budget?: string;
  creative?: string;
}

export interface ChoiceTool {
  field: keyof CampaignIntent;
  question: string;
  options: ChoiceOption[];
}

const objectiveChoices: ChoiceOption[] = [
  {
    id: "retarget",
    label: "Retarget existing visitors",
    detail: "Bring back people who browsed but didn't convert",
    recommended: true,
  },
  {
    id: "prospect",
    label: "Prospect for new customers",
    detail: "Reach new audiences who look like your best buyers",
  },
  {
    id: "abm",
    label: "Account-based targeting",
    detail: "Reach decision-makers at specific target companies",
  },
  {
    id: "awareness",
    label: "Build brand awareness",
    detail: "Broad reach to increase brand recognition",
  },
];

const audienceChoices: ChoiceOption[] = [
  {
    id: "cart-abandoners",
    label: "Cart abandoners",
    detail: "Last 14 days",
    recommended: true,
  },
  {
    id: "site-visitors",
    label: "All site visitors",
    detail: "Last 30 days",
  },
  {
    id: "lookalike",
    label: "Lookalike from top customers",
    detail: "Built from your highest-LTV buyers",
  },
  {
    id: "account-list",
    label: "Target account list",
    detail: "Upload or define your ICP",
  },
];

const budgetChoices: ChoiceOption[] = [
  { id: "1000", label: "$1,000/month", detail: "Starter — focused on one channel" },
  {
    id: "3000",
    label: "$3,000/month",
    detail: "Recommended — enough for multi-channel optimization",
    recommended: true,
  },
  { id: "5000", label: "$5,000/month", detail: "Growth — full channel mix with testing budget" },
  { id: "custom", label: "Custom amount" },
];

// Simulates AI reasoning: parse the user message for what's already been said
export function parseIntent(message: string): CampaignIntent {
  const lower = message.toLowerCase();
  const intent: CampaignIntent = {};

  // Objective detection
  if (lower.includes("retarget") || lower.includes("re-target") || lower.includes("cart abandon"))
    intent.objective = "retarget";
  else if (lower.includes("prospect") || lower.includes("new customer") || lower.includes("acquire"))
    intent.objective = "prospect";
  else if (lower.includes("account") || lower.includes("abm") || lower.includes("decision-maker"))
    intent.objective = "abm";
  else if (lower.includes("awareness") || lower.includes("brand"))
    intent.objective = "awareness";
  else if (lower.includes("demo") || lower.includes("trial") || lower.includes("lead gen"))
    intent.objective = "demand-gen";

  // Audience detection
  if (lower.includes("cart abandon")) intent.audience = "cart-abandoners";
  else if (lower.includes("site visitor") || lower.includes("website visitor"))
    intent.audience = "site-visitors";
  else if (lower.includes("lookalike")) intent.audience = "lookalike";
  else if (lower.includes("account list") || lower.includes("icp"))
    intent.audience = "account-list";

  // Budget detection
  const budgetMatch = lower.match(/\$\s?([\d,]+)/);
  if (budgetMatch) intent.budget = budgetMatch[1].replace(",", "");

  // Creative detection
  if (lower.includes("product") || lower.includes("catalog"))
    intent.creative = "catalog";
  else if (lower.includes("case stud")) intent.creative = "case-study";
  else if (lower.includes("generat")) intent.creative = "ai-generated";

  return intent;
}

// Merges new signals into existing intent
export function mergeIntent(
  existing: CampaignIntent,
  update: CampaignIntent
): CampaignIntent {
  return { ...existing, ...update };
}

// Simulates AI tool selection: what does the AI need to ask next?
export function getNextChoiceTool(
  intent: CampaignIntent
): ChoiceTool | null {
  if (!intent.objective) {
    return {
      field: "objective",
      question:
        "What's the goal for this campaign?",
      options: objectiveChoices,
    };
  }
  if (!intent.audience) {
    return {
      field: "audience",
      question: "Who should we target?",
      options: audienceChoices,
    };
  }
  if (!intent.budget) {
    return {
      field: "budget",
      question: "What's your monthly budget?",
      options: budgetChoices,
    };
  }
  return null;
}

// Resolves a choice selection back to a readable value for the intent
export function resolveChoice(
  field: keyof CampaignIntent,
  selectedIds: string[]
): string {
  return selectedIds[0] || "";
}

// Generates the acknowledgment text when the AI has enough info
export function getAcknowledgment(intent: CampaignIntent): string {
  const parts: string[] = [];
  if (intent.objective) {
    const labels: Record<string, string> = {
      retarget: "retargeting",
      prospect: "prospecting",
      abm: "account-based",
      awareness: "brand awareness",
      "demand-gen": "demand gen",
    };
    parts.push(labels[intent.objective] || intent.objective);
  }
  if (intent.audience) {
    const labels: Record<string, string> = {
      "cart-abandoners": "cart abandoners",
      "site-visitors": "site visitors",
      lookalike: "lookalike audience",
      "account-list": "target account list",
    };
    parts.push("targeting " + (labels[intent.audience] || intent.audience));
  }
  if (intent.budget) {
    const num = parseInt(intent.budget);
    if (!isNaN(num)) parts.push(`$${num.toLocaleString()}/month`);
  }
  return parts.length > 0
    ? `Got it — ${parts.join(", ")}. Building your plan now.`
    : "Building your campaign plan now.";
}

// Builds the Plan Card from the collected intent
export function buildPlanFromIntent(intent: CampaignIntent): CampaignPlan {
  const objectiveMap: Record<string, { name: string; value: string; rationale: string; channels: string; channelsRationale: string }> = {
    retarget: {
      name: "Retargeting Campaign",
      value: "Retarget recent visitors and drive conversions",
      rationale: "Retargeting converts at 3-5x the rate of cold traffic. Starting here maximizes early ROI while you build prospecting audiences.",
      channels: "Display retargeting (60%) + Social retargeting (40%)",
      channelsRationale: "Display retargeting captures high-intent visitors across the web. Social retargeting reinforces on platforms where users spend time.",
    },
    prospect: {
      name: "Prospecting Campaign",
      value: "Acquire new customers via prospecting",
      rationale: "Prospecting builds your funnel with new audiences. Lookalike models find users who resemble your best customers.",
      channels: "Social prospecting (50%) + Display (30%) + Video (20%)",
      channelsRationale: "Social platforms have the richest targeting for cold audiences. Display adds reach. Video builds awareness at efficient CPMs.",
    },
    abm: {
      name: "Account-Based Campaign",
      value: "Reach decision-makers at target accounts",
      rationale: "Account-based campaigns focus spend on high-value companies. Multi-channel touchpoints increase account engagement by 2.5x.",
      channels: "Account-based display (40%) + LinkedIn (35%) + Retargeting (25%)",
      channelsRationale: "LinkedIn captures professional intent. Display maintains awareness across the buying committee. Retargeting re-engages after site visits.",
    },
    awareness: {
      name: "Brand Awareness Campaign",
      value: "Build brand awareness and top-of-funnel reach",
      rationale: "Awareness campaigns establish brand recognition before direct-response efforts. Optimized for reach and frequency, not clicks.",
      channels: "Video (40%) + Display (35%) + Social (25%)",
      channelsRationale: "Video drives the strongest brand recall. Display provides broad reach at efficient CPMs. Social adds engagement.",
    },
    "demand-gen": {
      name: "Demand Gen Campaign",
      value: "Generate demo requests and trial signups",
      rationale: "Demo requests have the highest pipeline conversion rate (35-45%). Optimizing for demos rather than MQLs shortens the sales cycle.",
      channels: "LinkedIn (40%) + Display retargeting (30%) + Search (30%)",
      channelsRationale: "LinkedIn reaches professional buyers. Retargeting captures intent. Search captures active demand.",
    },
  };

  const audienceMap: Record<string, string> = {
    "cart-abandoners": "Cart abandoners (last 14 days)",
    "site-visitors": "Recent site visitors (last 30 days)",
    lookalike: "Lookalike from top customers by LTV",
    "account-list": "Target account list — matched to identity graph",
  };

  const obj = objectiveMap[intent.objective || "retarget"] || objectiveMap.retarget;
  const budgetNum = parseInt(intent.budget || "0");
  const budgetStr = budgetNum > 0 ? `$${budgetNum.toLocaleString()}/month` : "Not yet set";

  return {
    id: "plan-1",
    name: obj.name,
    status: "draft",
    sections: {
      objective: {
        label: "Objective",
        value: obj.value,
        rationale: obj.rationale,
        readiness: "ready",
        editable: true,
      },
      audience: {
        label: "Audience",
        value: intent.audience
          ? audienceMap[intent.audience] || "Custom audience"
          : "Not yet defined — connect a data source to build audience",
        rationale: "Audience quality is the single biggest lever for campaign performance. Higher-intent segments convert at 3-5x the rate of broad targeting.",
        readiness: intent.audience ? "ready" : "limited",
        editable: true,
      },
      budget: {
        label: "Budget",
        value: budgetStr,
        rationale: "Budget pacing ensures even daily spend. I'll optimize allocation across channels and alert you at 80% utilization.",
        readiness: intent.budget ? "ready" : "limited",
        editable: true,
      },
      channels: {
        label: "Channels",
        value: obj.channels,
        rationale: obj.channelsRationale,
        readiness: "ready",
        editable: true,
      },
      creative: {
        label: "Creative",
        value: intent.creative
          ? intent.creative === "catalog"
            ? "Dynamic product ads from catalog"
            : intent.creative === "case-study"
              ? "Case study-led creative"
              : "AI-generated variations"
          : "No assets yet — will generate from connected data",
        rationale: "Multiple creative variations enable A/B testing. I'll rotate top performers and pause underperformers automatically.",
        readiness: intent.creative ? "ready" : "limited",
        editable: true,
      },
      tracking: {
        label: "Tracking",
        value: "Connect a data source to enable conversion tracking",
        rationale: "Conversion tracking is required for optimization. Without it, I can only optimize for impressions and clicks.",
        readiness: "blocked",
        editable: false,
      },
    },
  };
}
