import type { PersonaId } from "@/types/persona";
import type { CampaignPlan } from "@/types/campaign";

export interface ConversationStep {
  id: string;
  question: string;
}

const universalSteps: ConversationStep[] = [
  {
    id: "objective",
    question:
      "What's the goal for this campaign — retargeting existing visitors, prospecting new customers, account-based targeting, or something else?",
  },
  {
    id: "audience",
    question:
      "Who should we target? I can work with your site visitors, a customer list, a lookalike audience, or a target account list. What do you have available?",
  },
  {
    id: "budget",
    question:
      "What's your monthly budget for this campaign? This helps me optimize channel allocation and pacing.",
  },
  {
    id: "creative",
    question:
      "Do you have creative assets ready, or should I generate variations? I can pull from your product catalog, case studies, or brand guidelines if connected.",
  },
];

export const campaignFlowSteps: Record<PersonaId, ConversationStep[]> = {
  "cynthia-b2c": universalSteps,
  "cynthia-b2b": universalSteps,
  "cynthia-agency": universalSteps,
};

export function buildPlanFromAnswers(
  _personaId: PersonaId,
  answers: Record<string, string>
): CampaignPlan {
  const campaignType = inferCampaignType(answers.objective);

  return {
    id: "plan-1",
    name: campaignType.name,
    status: "draft",
    sections: {
      objective: {
        label: "Objective",
        value: campaignType.objective,
        rationale: campaignType.objectiveRationale,
        readiness: "ready",
        editable: true,
      },
      audience: {
        label: "Audience",
        value: inferAudience(answers.audience),
        rationale:
          "Audience quality is the single biggest lever for campaign performance. Higher-intent segments convert at 3-5x the rate of broad targeting.",
        readiness: answers.audience ? "ready" : "limited",
        editable: true,
      },
      budget: {
        label: "Budget",
        value: inferBudget(answers.budget),
        rationale:
          "Budget pacing ensures even daily spend. I'll optimize allocation across channels and alert you at 80% utilization.",
        readiness: answers.budget ? "ready" : "limited",
        editable: true,
      },
      channels: {
        label: "Channels",
        value: campaignType.channels,
        rationale: campaignType.channelsRationale,
        readiness: "ready",
        editable: true,
      },
      creative: {
        label: "Creative",
        value: inferCreative(answers.creative),
        rationale:
          "Multiple creative variations enable A/B testing. I'll rotate top performers and pause underperformers automatically.",
        readiness: answers.creative ? "ready" : "limited",
        editable: true,
      },
      tracking: {
        label: "Tracking",
        value: "Connect a data source to enable conversion tracking",
        rationale:
          "Conversion tracking is required for optimization. Without it, I can only optimize for impressions and clicks.",
        readiness: "blocked",
        editable: false,
      },
    },
  };
}

interface CampaignType {
  name: string;
  objective: string;
  objectiveRationale: string;
  channels: string;
  channelsRationale: string;
}

function inferCampaignType(answer: string | undefined): CampaignType {
  const lower = (answer || "").toLowerCase();

  if (lower.includes("account") || lower.includes("abm")) {
    return {
      name: "Account-Based Campaign",
      objective: "Reach decision-makers at target accounts",
      objectiveRationale:
        "Account-based campaigns focus spend on high-value companies. Multi-channel touchpoints increase account engagement by 2.5x vs. single-channel.",
      channels:
        "Account-based display (40%) + LinkedIn (35%) + Retargeting (25%)",
      channelsRationale:
        "LinkedIn captures professional intent. Display maintains awareness across the buying committee. Retargeting re-engages after site visits.",
    };
  }

  if (lower.includes("prospect") || lower.includes("new")) {
    return {
      name: "Prospecting Campaign",
      objective: "Acquire new customers via prospecting",
      objectiveRationale:
        "Prospecting builds your funnel with new audiences. Lookalike models find users who resemble your best customers.",
      channels: "Social prospecting (50%) + Display (30%) + Video (20%)",
      channelsRationale:
        "Social platforms have the richest targeting for cold audiences. Display adds reach. Video builds awareness at efficient CPMs.",
    };
  }

  if (lower.includes("demo") || lower.includes("trial") || lower.includes("lead")) {
    return {
      name: "Demand Gen Campaign",
      objective: "Generate demo requests and trial signups",
      objectiveRationale:
        "Demo requests have the highest pipeline conversion rate (35-45%). Optimizing for demos rather than MQLs shortens the sales cycle.",
      channels:
        "LinkedIn (40%) + Display retargeting (30%) + Search (30%)",
      channelsRationale:
        "LinkedIn reaches professional buyers by role and company. Retargeting captures intent. Search captures active demand.",
    };
  }

  // Default to retargeting
  return {
    name: "Retargeting Campaign",
    objective: "Retarget recent visitors and drive conversions",
    objectiveRationale:
      "Retargeting converts at 3-5x the rate of cold traffic. Starting here maximizes early ROI while you build prospecting audiences.",
    channels: "Display retargeting (60%) + Social retargeting (40%)",
    channelsRationale:
      "Display retargeting captures high-intent visitors across the web. Social retargeting reinforces on platforms where users spend time.",
  };
}

function inferAudience(answer: string | undefined): string {
  if (!answer) return "Not yet defined — connect a data source to build audience";
  const lower = answer.toLowerCase();
  if (lower.includes("cart")) return "Cart abandoners (last 14 days)";
  if (lower.includes("lookalike")) return "Lookalike from top customers by LTV";
  if (lower.includes("visitor")) return "Recent site visitors (last 30 days)";
  if (lower.includes("account") || lower.includes("list"))
    return "Target account list — matched to identity graph";
  if (lower.includes("icp")) return "ICP-based audience from firmographic data";
  if (lower.includes("crm")) return "CRM-synced audience — decision-makers at target companies";
  return "Custom audience from connected data";
}

function inferBudget(answer: string | undefined): string {
  if (!answer) return "Not yet set";
  const match = answer.match(/\$?([\d,]+)/);
  if (match) {
    const num = parseInt(match[1].replace(",", ""));
    return `$${num.toLocaleString()}/month`;
  }
  return answer;
}

function inferCreative(answer: string | undefined): string {
  if (!answer) return "No assets yet — will generate from connected data";
  const lower = answer.toLowerCase();
  if (lower.includes("product") || lower.includes("catalog"))
    return "Dynamic product ads from catalog";
  if (lower.includes("case stud")) return "Case study-led creative";
  if (lower.includes("generat")) return "AI-generated variations";
  if (lower.includes("brand")) return "Brand-compliant creative variations";
  return "Custom creative assets";
}
