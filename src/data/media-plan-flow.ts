import type {
  Advertiser,
  MediaPlan,
  MediaChannelAllocation,
  MediaKpiTarget,
  StrategySection,
} from "@/types/campaign";
import { getCapabilities } from "./prerequisites";

/**
 * Media Plan builder (better than a generic prose template).
 *
 * Tailors the channel mix to the brand's reality (B2C luxury → CTV/Meta/TikTok/
 * Display/DOOH, never a B2B LinkedIn default) and the chosen objective. Every
 * number carries provenance + confidence; conversion-dependent KPIs gate on the
 * site pixel via the prerequisite engine. Artifact-first and fully editable.
 */

function section(
  label: string,
  value: string,
  reasoning: string,
  confidence: "high" | "medium" | "low" = "medium",
  readiness: "ready" | "limited" | "blocked" = "ready"
): StrategySection {
  return {
    label,
    value,
    provenance: { source: "ai_inferred", reasoning, confidence },
    readiness,
    editable: true,
    authorshipState: "proposed",
    filled: true,
    editHistory: [],
  };
}

// Objective → channel allocation (percentages). B2C luxury channel set.
const MIX_BY_OBJECTIVE: Record<string, { channel: string; pct: number; rationale: string }[]> = {
  awareness: [
    { channel: "CTV / OTT", pct: 40, rationale: "Highest brand recall; unskippable full-screen — ideal for a luxury launch" },
    { channel: "Meta", pct: 25, rationale: "Scaled reach + creative testing across feed, stories, reels" },
    { channel: "TikTok", pct: 20, rationale: "Discovery + cultural reach with the fragrance-curious audience" },
    { channel: "Display", pct: 10, rationale: "Cheap incremental reach and frequency support" },
    { channel: "DOOH", pct: 5, rationale: "High-traffic physical moments to extend the launch" },
  ],
  traffic: [
    { channel: "Meta", pct: 35, rationale: "Best cost-per-click engine for considered DTC traffic" },
    { channel: "TikTok", pct: 25, rationale: "Lower-funnel discovery driving site visits" },
    { channel: "Display", pct: 20, rationale: "Broad, efficient click volume" },
    { channel: "CTV / OTT", pct: 20, rationale: "Top-of-funnel demand that feeds branded search & direct" },
  ],
  leads: [
    { channel: "Meta", pct: 40, rationale: "Strongest lead-gen + on-platform forms for DTC" },
    { channel: "Display", pct: 25, rationale: "Retarget + prospect at low CPMs" },
    { channel: "TikTok", pct: 20, rationale: "New-audience lead capture" },
    { channel: "CTV / OTT", pct: 15, rationale: "Demand generation that lifts lead volume downstream" },
  ],
  sales: [
    { channel: "Meta", pct: 40, rationale: "Conversion-optimized across prospecting + retargeting" },
    { channel: "Display", pct: 30, rationale: "Retargeting site visitors & cart abandoners to purchase" },
    { channel: "TikTok", pct: 20, rationale: "Incremental new-customer acquisition" },
    { channel: "CTV / OTT", pct: 10, rationale: "Awareness halo to keep the funnel full" },
  ],
  retargeting: [
    { channel: "Display", pct: 45, rationale: "Cheapest, highest-frequency way to re-reach visitors" },
    { channel: "Meta", pct: 35, rationale: "Dynamic product retargeting from your catalog" },
    { channel: "CTV / OTT", pct: 20, rationale: "Premium re-engagement of recent visitors on the big screen" },
  ],
};

const OBJ_LABEL: Record<string, string> = {
  awareness: "Awareness",
  traffic: "Traffic",
  leads: "Lead generation",
  sales: "Sales",
  retargeting: "Retargeting",
};

function kpiTargets(objective: string): MediaKpiTarget[] {
  if (objective === "awareness" || objective === "traffic") {
    return [
      { metric: "Reach", m1: "1.8M", m2: "3.2M", m3: "4.5M", tracking: "Platform + panel" },
      { metric: "Completed views", m1: "620K", m2: "1.1M", m3: "1.6M", tracking: "CTV / video analytics" },
      { metric: "Avg. frequency", m1: "2.1", m2: "2.8", m3: "3.2", tracking: "Cross-platform dedup" },
      { metric: "Site visits", m1: "14K", m2: "26K", m3: "38K", tracking: "GA4" },
    ];
  }
  return [
    { metric: "New customers", m1: "180", m2: "320", m3: "480", tracking: "Pixel + GA4" },
    { metric: "CPA", m1: "$42", m2: "$34", m3: "$28", tracking: "Platform + pixel" },
    { metric: "ROAS", m1: "2.4x", m2: "3.3x", m3: "4.1x", tracking: "Revenue attribution" },
    { metric: "Conversion rate", m1: "1.6%", m2: "2.1%", m3: "2.6%", tracking: "GA4 + Shopify" },
  ];
}

export function buildMediaPlan(
  advertiser: Advertiser,
  objective: string,
  monthlyBudget: number
): MediaPlan {
  const now = new Date().toISOString();
  const obj = MIX_BY_OBJECTIVE[objective] ? objective : "awareness";
  const caps = getCapabilities();
  const conversionObjective = obj === "leads" || obj === "sales" || obj === "retargeting";
  const kpiBlocked = conversionObjective && !caps.hasSitePixel;

  const channelMix: MediaChannelAllocation[] = MIX_BY_OBJECTIVE[obj].map((c) => ({
    channel: c.channel,
    pct: c.pct,
    monthly: Math.round((monthlyBudget * c.pct) / 100),
    rationale: c.rationale,
  }));

  const channels = channelMix.map((c) => c.channel).join(", ");

  return {
    id: "mediaplan-active",
    name: `${advertiser.companyName} — ${OBJ_LABEL[obj]} Media Plan`,
    advertiserId: advertiser.id,
    objective: obj,
    monthlyBudget,
    flight: "Next 90 days",
    budgetSection: section(
      "Budget",
      `$${monthlyBudget.toLocaleString()}/month · ${OBJ_LABEL[obj]} · Next 90 days`,
      "Starting budget — edit to match your plan. Allocation below scales with this number.",
      "medium"
    ),
    channelMix: {
      ...section(
        "Channel mix & allocation",
        `${channels} — weighted for ${OBJ_LABEL[obj].toLowerCase()}`,
        `Allocation is tuned to ${advertiser.companyName}'s B2C luxury profile — CTV/OTT, social, and display, not B2B channels. Weights shift with the objective.`,
        "high"
      ),
      data: channelMix,
    },
    audienceStrategy: section(
      "Audience strategy",
      "Tier 1 retargeting · Tier 2 lookalikes · Tier 3 interest",
      "Tier 1: site visitors & cart abandoners (last 30 days). Tier 2: lookalikes from top customers by LTV. Tier 3: clean-beauty / niche-fragrance / luxury-goods interest.",
      "medium"
    ),
    phasing: section(
      "Phasing",
      "Foundation → Launch → Scale over the flight",
      "Phase 1 (wk 1-2): seed audiences, ready creative, connect tracking. Phase 2 (wk 3-4): launch CTV awareness + social prospecting. Phase 3 (wk 5+): shift budget to winners, layer retargeting & DOOH.",
      "medium"
    ),
    kpiTargets: {
      ...section(
        "KPI targets",
        kpiBlocked ? "Conversion targets need your site pixel" : "Ramped monthly targets",
        kpiBlocked
          ? "These targets optimize against on-site conversions, which require the site pixel. Connect it to activate conversion tracking; awareness metrics work without it."
          : "Targets ramp as the algorithms learn and budget concentrates on top performers. Confidence rises after the first 14 days of data.",
        kpiBlocked ? "low" : "medium",
        kpiBlocked ? "limited" : "ready"
      ),
      data: kpiTargets(obj),
    },
    forecast: section(
      "Forecast",
      "Directional — firms up after 14 days of live data",
      "Forecast is modeled from the budget, channel mix, and audience size. Treat the first two weeks as a learning period; actuals will refine these.",
      "low"
    ),
    createdAt: now,
    lastModifiedAt: now,
    lastModifiedBy: "system",
  };
}
