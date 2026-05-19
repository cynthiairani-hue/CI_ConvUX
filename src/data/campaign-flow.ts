import type {
  CampaignPlan,
  Advertiser,
  IABIndustry,
  IABRestrictedCategory,
  StrategyPlan,
  PlacementType,
  KeywordChip,
} from "@/types/campaign";
import type { ChoiceOption } from "@/components/ai-companion/chat-choices";
import { generateKeywordsForIndustry } from "./keyword-mocks";
import { getCurrentBrand } from "./brand-profiles";
import { generateForecast } from "./forecast-mocks";

export interface CampaignIntent {
  objective?: string;
  audience?: string;
  budget?: string;
}

export interface ChoiceTool {
  field: keyof CampaignIntent;
  question: string;
  subtitle?: string;
  step: number;
  totalSteps: number;
  options: ChoiceOption[];
}

const objectiveChoices: ChoiceOption[] = [
  {
    id: "awareness",
    label: "Awareness",
    detail: "Reach more viewers to grow your brand",
  },
  {
    id: "traffic",
    label: "Traffic",
    detail: "Increase web traffic",
  },
  {
    id: "leads",
    label: "Leads",
    detail: "Generate qualified leads",
  },
  {
    id: "sales",
    label: "Sales",
    detail: "Increase your sales",
    recommended: true,
  },
  {
    id: "retargeting",
    label: "Retargeting",
    detail: "Reconnect with your audience using existing data",
  },
  {
    id: "app-promotion",
    label: "App promotion",
    detail: "Drive app installs and in-app revenue",
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

export function parseIntent(message: string): CampaignIntent {
  const lower = message.toLowerCase();
  const intent: CampaignIntent = {};

  if (lower.includes("awareness") || lower.includes("brand"))
    intent.objective = "awareness";
  else if (lower.includes("traffic") || lower.includes("visit"))
    intent.objective = "traffic";
  else if (lower.includes("lead") || lower.includes("qualified"))
    intent.objective = "leads";
  else if (lower.includes("sale") || lower.includes("revenue") || lower.includes("convert"))
    intent.objective = "sales";
  else if (lower.includes("retarget") || lower.includes("re-target") || lower.includes("cart abandon"))
    intent.objective = "retargeting";
  else if (lower.includes("app") || lower.includes("install"))
    intent.objective = "app-promotion";

  if (lower.includes("cart abandon")) intent.audience = "cart-abandoners";
  else if (lower.includes("site visitor") || lower.includes("website visitor"))
    intent.audience = "site-visitors";
  else if (lower.includes("lookalike")) intent.audience = "lookalike";
  else if (lower.includes("account list") || lower.includes("icp"))
    intent.audience = "account-list";

  const budgetMatch = lower.match(/\$\s?([\d,]+)/);
  if (budgetMatch) intent.budget = budgetMatch[1].replace(",", "");

  return intent;
}

export function mergeIntent(
  existing: CampaignIntent,
  update: CampaignIntent
): CampaignIntent {
  return { ...existing, ...update };
}

const TOTAL_STEPS = 3;

export function getNextChoiceTool(
  intent: CampaignIntent
): ChoiceTool | null {
  if (!intent.objective) {
    return {
      field: "objective",
      question: "What's the goal for this campaign?",
      subtitle: "This determines how we optimize your spend:",
      step: 1,
      totalSteps: TOTAL_STEPS,
      options: objectiveChoices,
    };
  }
  if (!intent.audience) {
    return {
      field: "audience",
      question: "Who should we target?",
      subtitle: "Pick the audience that best matches your goal:",
      step: 2,
      totalSteps: TOTAL_STEPS,
      options: audienceChoices,
    };
  }
  if (!intent.budget) {
    return {
      field: "budget",
      question: "What's your monthly budget?",
      subtitle: "This helps optimize channel allocation and pacing:",
      step: 3,
      totalSteps: TOTAL_STEPS,
      options: budgetChoices,
    };
  }
  return null;
}

export function resolveChoice(
  field: keyof CampaignIntent,
  selectedIds: string[]
): string {
  return selectedIds[0] || "";
}

export function getAcknowledgment(intent: CampaignIntent): string {
  const parts: string[] = [];
  if (intent.objective) {
    const labels: Record<string, string> = {
      awareness: "brand awareness",
      traffic: "traffic",
      leads: "lead generation",
      sales: "sales",
      retargeting: "retargeting",
      "app-promotion": "app promotion",
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
    ? `Got it — ${parts.join(", ")}. Building your media plan now.`
    : "Building your media plan now.";
}

interface ObjectiveConfig {
  name: string;
  value: string;
  rationale: string;
  channels: string;
  channelsRationale: string;
  conversionEvent: string;
}

/** Objective options for inline editing on the strategy card */
export const OBJECTIVE_OPTIONS: { id: string; label: string; value: string }[] = [
  { id: "awareness", label: "Awareness", value: "Reach more viewers to grow your brand" },
  { id: "traffic", label: "Traffic", value: "Drive qualified visitors to your site" },
  { id: "leads", label: "Leads", value: "Generate qualified leads for your pipeline" },
  { id: "sales", label: "Sales", value: "Increase your sales and revenue" },
  { id: "retargeting", label: "Retargeting", value: "Reconnect with your audience using existing data" },
  { id: "app-promotion", label: "App promotion", value: "Drive app installs and in-app revenue" },
];

const objectiveMap: Record<string, ObjectiveConfig> = {
  awareness: {
    name: "Brand Awareness Campaign",
    value: "Reach more viewers to grow your brand",
    rationale: "Awareness campaigns establish brand recognition before direct-response efforts. Optimized for reach and frequency, not clicks.",
    channels: "Video (40%) + Display (35%) + Social (25%)",
    channelsRationale: "Video drives the strongest brand recall. Display provides broad reach at efficient CPMs. Social adds engagement.",
    conversionEvent: "Video views, impressions, brand lift",
  },
  traffic: {
    name: "Traffic Campaign",
    value: "Drive qualified visitors to your site",
    rationale: "Traffic campaigns fill the top of your funnel. Optimized for click-through rate and cost per visit.",
    channels: "Display (40%) + Social (35%) + Native (25%)",
    channelsRationale: "Display drives broad reach at low CPC. Social targets interest-based audiences. Native blends into content for higher engagement.",
    conversionEvent: "Page views, session duration, bounce rate",
  },
  leads: {
    name: "Lead Generation Campaign",
    value: "Generate qualified leads for your pipeline",
    rationale: "Lead gen campaigns optimize for form fills and demo requests. Quality over quantity — a smaller number of qualified leads outperforms a larger number of unqualified ones.",
    channels: "LinkedIn (40%) + Display retargeting (30%) + Search (30%)",
    channelsRationale: "LinkedIn reaches professional buyers by title and company. Retargeting captures warm intent. Search captures active demand.",
    conversionEvent: "Form submissions, demo requests, content downloads",
  },
  sales: {
    name: "Sales Campaign",
    value: "Increase your sales and revenue",
    rationale: "Sales campaigns optimize for purchases and revenue. Multi-touch attribution tracks the full path from ad to conversion.",
    channels: "Display retargeting (40%) + Social (35%) + Search (25%)",
    channelsRationale: "Retargeting converts high-intent visitors. Social reaches buyers mid-funnel. Search captures purchase-ready demand.",
    conversionEvent: "Purchases, revenue, ROAS",
  },
  retargeting: {
    name: "Retargeting Campaign",
    value: "Reconnect with your audience using existing data",
    rationale: "Retargeting converts at 3-5x the rate of cold traffic. Starting here maximizes early ROI while you build prospecting audiences.",
    channels: "Display retargeting (60%) + Social retargeting (40%)",
    channelsRationale: "Display retargeting captures high-intent visitors across the web. Social retargeting reinforces on platforms where users spend time.",
    conversionEvent: "Conversions, return visits, cart completions",
  },
  "app-promotion": {
    name: "App Promotion Campaign",
    value: "Drive app installs and in-app revenue",
    rationale: "App campaigns optimize for installs and post-install events. Deep linking ensures users land in the right in-app experience.",
    channels: "Mobile display (40%) + Social (35%) + App store ads (25%)",
    channelsRationale: "Mobile display reaches users in-app. Social targets based on interests and behavior. App store ads capture high-intent searchers.",
    conversionEvent: "Installs, in-app purchases, app opens",
  },
};

const audienceMap: Record<string, string> = {
  "cart-abandoners": "Cart abandoners (last 14 days)",
  "site-visitors": "Recent site visitors (last 30 days)",
  lookalike: "Lookalike from top customers by LTV",
  "account-list": "Target account list — matched to identity graph",
};

// --- New Strategy Flow ---

export interface StrategyIntent {
  advertiserId?: string;
  advertiserSetup?: {
    companyName?: string;
    websiteUrl?: string;
    industry?: IABIndustry;
    restrictedCategories?: IABRestrictedCategory[];
  };
  objective?: string;
  selectedKeywords?: string[];
  /** Full keyword chips — used to resolve IDs to labels when building strategy */
  allKeywords?: KeywordChip[];
}

export interface StrategyChoiceTool {
  type: "choices";
  field: string;
  question: string;
  subtitle?: string;
  step: number;
  totalSteps: number;
  options: ChoiceOption[];
}

export interface StrategyAdvertiserTool {
  type: "advertiser-setup";
  field: "advertiserSetup";
  question: string;
  step: number;
  totalSteps: number;
}

export interface StrategyKeywordsTool {
  type: "keywords";
  field: "selectedKeywords";
  question: string;
  step: number;
  totalSteps: number;
  keywords: KeywordChip[];
}

export type StrategyFlowTool = StrategyChoiceTool | StrategyAdvertiserTool | StrategyKeywordsTool;

export function getNextStrategyTool(
  intent: StrategyIntent,
  hasAdvertiser: boolean
): StrategyFlowTool | null {
  const missing: string[] = [];
  if (!hasAdvertiser && !intent.advertiserSetup?.companyName) missing.push("advertiser");
  if (!intent.objective) missing.push("objective");
  if (intent.objective && (hasAdvertiser || intent.advertiserSetup?.companyName) && !intent.selectedKeywords) {
    missing.push("keywords");
  }

  if (missing.length === 0) return null;

  const totalSteps = missing.length;
  const currentStep = 1;

  if (missing[0] === "advertiser") {
    return {
      type: "advertiser-setup",
      field: "advertiserSetup",
      question: "First, let’s set up your advertiser profile.",
      step: currentStep,
      totalSteps,
    };
  }

  if (missing[0] === "objective") {
    return {
      type: "choices",
      field: "objective",
      question: "What’s the goal for this campaign?",
      subtitle: "This determines how we optimize your spend:",
      step: currentStep,
      totalSteps,
      options: objectiveChoices,
    };
  }

  if (missing[0] === "keywords") {
    const advertiserSetup = intent.advertiserSetup;
    const websiteUrl = advertiserSetup?.websiteUrl || "example.com";
    const industry = advertiserSetup?.industry || "other";
    // Use brand-specific keywords when available — real to the brand, not generic industry
    const brand = getCurrentBrand();
    const keywords = generateKeywordsForIndustry(industry, websiteUrl, brand?.keywords);
    return {
      type: "keywords",
      field: "selectedKeywords",
      question: "Here are suggested keywords based on your profile.",
      step: currentStep,
      totalSteps,
      keywords,
    };
  }

  return null;
}

const defaultPlacementsByObjective: Record<string, PlacementType[]> = {
  awareness: ["video", "display", "ctv-ott"],
  traffic: ["display", "native", "in-app"],
  leads: ["display", "native", "video"],
  sales: ["display", "native", "in-app", "video"],
  retargeting: ["display", "native"],
  "app-promotion": ["in-app", "video", "display"],
};

const defaultBudgetByObjective: Record<string, number> = {
  awareness: 5000,
  traffic: 3000,
  leads: 4000,
  sales: 3000,
  retargeting: 2000,
  "app-promotion": 4000,
};

export function buildStrategyFromIntent(
  intent: StrategyIntent,
  advertiser: Advertiser
): StrategyPlan {
  const obj = objectiveMap[intent.objective || "sales"] || objectiveMap.sales;
  const monthlyBudget = defaultBudgetByObjective[intent.objective || "sales"] || 3000;
  const dailyBudget = Math.round(monthlyBudget / 30);
  const placements = defaultPlacementsByObjective[intent.objective || "sales"] || ["display"];

  // Resolve keyword IDs to labels using the full keyword list
  const keywordLookup = new Map(
    (intent.allKeywords || []).map((k) => [k.id, k.label])
  );
  const resolvedInterests = (intent.selectedKeywords || [])
    .slice(0, 5)
    .map((id) => keywordLookup.get(id) || id);

  const audience = {
    locations: ["United States"],
    marketInterests: resolvedInterests,
    customAudiences: [],
    ageRange: { min: 25, max: 54 },
    gender: "all" as const,
    demographics: ["Homeowners", "College educated"],
  };

  const forecast = generateForecast(dailyBudget, placements, audience);

  const now = new Date().toISOString();

  return {
    id: `strategy-${Date.now()}`,
    name: `${advertiser.companyName} — ${obj.name}`,
    status: "draft",
    advertiserId: advertiser.id,
    objective: {
      label: "Objective",
      value: obj.value,
      provenance: { source: "ai_inferred", reasoning: obj.rationale, confidence: "high" },
      readiness: "ready",
      editable: true,
      authorshipState: "proposed",
      filled: true,
      editHistory: [],
    },
    budgetSchedule: {
      label: "Budget & Schedule",
      value: `$${dailyBudget}/day · $${monthlyBudget.toLocaleString()}/month · Always on`,
      provenance: { source: "default", reasoning: "Budget pacing ensures even daily spend. I'll optimize allocation across channels and alert you at 80% utilization.", confidence: "medium" },
      readiness: "ready",
      editable: true,
      authorshipState: "proposed",
      filled: true,
      editHistory: [],
      data: {
        dailyBudget,
        monthlyBudget,
        startDate: null,
        endDate: null,
        alwaysOn: true,
      },
    },
    audience: {
      label: "Audience",
      value: `${audience.locations.join(", ")} · Ages ${audience.ageRange.min}-${audience.ageRange.max} · ${audience.gender === "all" ? "All genders" : audience.gender}`,
      provenance: { source: "ai_inferred", reasoning: "Audience quality is the single biggest lever for campaign performance. Higher-intent segments convert at 3-5x the rate of broad targeting.", confidence: "medium" },
      readiness: "ready",
      editable: true,
      authorshipState: "proposed",
      filled: true,
      editHistory: [],
      data: audience,
    },
    placements: {
      label: "Placements",
      value: placements.map((p) => {
        const labels: Record<PlacementType, string> = {
          display: "Display", video: "Video", "ctv-ott": "CTV/OTT",
          native: "Native", audio: "Audio", dooh: "DOOH",
          "in-app": "In-App", "rich-media": "Rich Media",
        };
        return labels[p];
      }).join(", "),
      provenance: { source: "ai_inferred", reasoning: obj.channelsRationale, confidence: "high" },
      readiness: "ready",
      editable: true,
      authorshipState: "proposed",
      filled: true,
      editHistory: [],
      data: placements,
    },
    bidding: {
      label: "Bidding",
      value: "Automatic (recommended)",
      provenance: { source: "default", reasoning: "Automatic bidding uses real-time signals to optimize bids per impression.", confidence: "high" },
      readiness: "ready",
      editable: true,
      authorshipState: "proposed",
      filled: true,
      editHistory: [],
      data: {
        strategy: "automatic",
        manualCpm: null,
      },
    },
    creative: {
      label: "Creative",
      value: "No assets yet — upload or generate with AI",
      provenance: { source: "default", reasoning: "Multiple creative variations enable A/B testing. I'll rotate top performers and pause underperformers automatically." },
      readiness: "limited",
      editable: true,
      authorshipState: "proposed",
      filled: false,
      editHistory: [],
      data: {
        status: "not-started",
        assets: [],
      },
    },
    forecast: {
      label: "Forecast",
      value: `~${forecast.dailyReach.toLocaleString()} daily reach · ~${forecast.dailyImpressions.toLocaleString()} daily impressions`,
      provenance: { source: "ai_inferred", reasoning: "Forecast is based on your budget, placements, and audience size. Actual performance may vary during the first 7 days as the system optimizes.", confidence: forecast.confidenceLevel },
      readiness: forecast.confidenceLevel === "low" ? "limited" : "ready",
      editable: false,
      authorshipState: "proposed",
      filled: true,
      editHistory: [],
      data: forecast,
    },
    keywords: [],
    createdAt: now,
    lastModifiedAt: now,
    lastModifiedBy: "system",
  };
}

// --- Legacy Plan Builder (backward compat) ---

export function buildPlanFromIntent(intent: CampaignIntent): CampaignPlan {
  const obj = objectiveMap[intent.objective || "sales"] || objectiveMap.sales;
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
          : "Not yet defined — connect a data source or upload a list",
        rationale: "Audience quality is the single biggest lever for campaign performance. Higher-intent segments convert at 3-5x the rate of broad targeting.",
        readiness: intent.audience ? "limited" : "blocked",
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
      schedule: {
        label: "Schedule",
        value: "Not set — define start and end dates",
        rationale: "Campaign schedule controls pacing and budget allocation. Always-on campaigns pace daily; fixed flights concentrate spend within the window.",
        readiness: "limited",
        editable: true,
      },
      destination: {
        label: "Destination URL",
        value: "Not set — where should clicks land?",
        rationale: "Landing page relevance directly impacts conversion rate and quality score. Match the landing page to the campaign objective.",
        readiness: "limited",
        editable: true,
      },
      creative: {
        label: "Creative",
        value: "No assets yet — upload or connect to generate",
        rationale: "Multiple creative variations enable A/B testing. I'll rotate top performers and pause underperformers automatically.",
        readiness: "limited",
        editable: true,
      },
      conversion: {
        label: "Conversion events",
        value: obj.conversionEvent,
        rationale: "Conversion events tell the optimization engine what to optimize for. Choose events that align with your business objective, not vanity metrics.",
        readiness: "limited",
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
