import type { Advertiser, CompetitiveBrief, CompetitorRow, StrategySection } from "@/types/campaign";

/**
 * Competitive Intelligence builder (Phase 9A).
 *
 * Produces an artifact-first competitive brief from simulated public-web data
 * (SimilarWeb-style traffic share + Claude-style messaging analysis). Needs no
 * pixel — pulls "public" signal — so it delivers value at cold start and acts
 * as the PLG hook that drives pixel install.
 *
 * All data is mocked from seed; no real SimilarWeb / scraping / Claude calls.
 */

function section(
  label: string,
  value: string,
  reasoning: string,
  confidence: "high" | "medium" | "low" = "medium"
): StrategySection {
  return {
    label,
    value,
    provenance: { source: "ai_inferred", reasoning, confidence },
    readiness: "ready",
    editable: true,
    authorshipState: "proposed",
    filled: true,
    editHistory: [],
  };
}

interface BriefData {
  competitors: CompetitorRow[];
  marketPosition: string;
  marketPositionWhy: string;
  messaging: string;
  messagingWhy: string;
  whereToWin: string;
  whereToWinWhy: string;
}

// Brand-keyed competitive datasets so each profile gets a coherent brief
// (B2C luxury vs B2B SaaS look nothing alike).
const BRIEF_BY_DOMAIN: Record<string, BriefData> = {
  "ffern.co": {
    competitors: [
      { name: "Le Labo", trafficShare: "24%", trend: "+2 pts", primaryChannel: "Retail + organic" },
      { name: "Byredo", trafficShare: "19%", trend: "−1 pt", primaryChannel: "Paid social" },
      { name: "Diptyque", trafficShare: "17%", trend: "flat", primaryChannel: "Search + retail" },
      { name: "Jo Malone", trafficShare: "15%", trend: "+1 pt", primaryChannel: "Paid social + CTV" },
      { name: "Aesop", trafficShare: "13%", trend: "+3 pts", primaryChannel: "Organic + PR" },
    ],
    marketPosition: "challenger tier of niche luxury fragrance — strong brand affinity, smaller paid footprint than the category leaders",
    marketPositionWhy: "owned/organic strength outpaces paid presence, leaving headroom in paid awareness",
    messaging: "Competitors lead on heritage and scent-craft; few own sustainability + seasonal-ritual storytelling.",
    messagingWhy: "Le Labo/Diptyque anchor on craft heritage; Byredo on art-direction; none strongly own the seasonal-waitlist ritual.",
    whereToWin: "CTV awareness on the seasonal ritual; sustainability proof points; defend branded search.",
    whereToWinWhy: "Competitors under-invest in CTV — a premium awareness channel where cinematic assets stand out. Pair with sustainability messaging (white space) and protect branded search.",
  },
  "norwest.io": {
    competitors: [
      { name: "Tableau", trafficShare: "28%", trend: "flat", primaryChannel: "Field + events" },
      { name: "Looker", trafficShare: "22%", trend: "+1 pt", primaryChannel: "Search + content" },
      { name: "Amplitude", trafficShare: "20%", trend: "+2 pts", primaryChannel: "Product-led + content" },
      { name: "Mixpanel", trafficShare: "18%", trend: "−1 pt", primaryChannel: "Product-led" },
      { name: "ThoughtSpot", trafficShare: "12%", trend: "+3 pts", primaryChannel: "Paid + ABM" },
    ],
    marketPosition: "challenger tier of B2B revenue analytics — strong product-led signal, lighter paid presence than the incumbents",
    marketPositionWhy: "product-led adoption outpaces paid demand-gen, leaving headroom in targeted ABM and demand capture",
    messaging: "Incumbents lead on enterprise-BI breadth; few own the RevOps-native, fast-time-to-value story.",
    messagingWhy: "Tableau/Looker anchor on enterprise breadth; Amplitude/Mixpanel on product analytics; none strongly own 'time-to-insight for revenue teams.'",
    whereToWin: "LinkedIn + CTV demand gen to RevOps leaders; own 'time-to-insight'; defend branded search.",
    whereToWinWhy: "Incumbents under-invest in CTV and RevOps-specific messaging. Pair LinkedIn ABM with a CTV awareness layer and protect branded search from conquesting.",
  },
};

function genericBrief(): BriefData {
  return {
    competitors: [
      { name: "Market leader", trafficShare: "26%", trend: "flat", primaryChannel: "Search + brand" },
      { name: "Challenger A", trafficShare: "19%", trend: "+2 pts", primaryChannel: "Paid social" },
      { name: "Challenger B", trafficShare: "16%", trend: "−1 pt", primaryChannel: "Content + SEO" },
      { name: "Challenger C", trafficShare: "12%", trend: "+1 pt", primaryChannel: "Paid + retargeting" },
    ],
    marketPosition: "a challenger position — room to grow paid reach against the category leaders",
    marketPositionWhy: `organic presence outpaces its paid footprint, leaving headroom in paid awareness`,
    messaging: "Competitors compete on table-stakes claims; clear white space on differentiated positioning.",
    messagingWhy: "Most rivals echo the same value props — a sharper, ownable angle is available.",
    whereToWin: "Lead with an underused premium channel and defend branded search.",
    whereToWinWhy: "Competitors concentrate on the same channels; an awareness layer plus branded-search defense is the opening.",
  };
}

export function buildCompetitiveBrief(advertiser: Advertiser): CompetitiveBrief {
  const now = new Date().toISOString();
  const name = advertiser.companyName;
  const domain = advertiser.websiteUrl || "your site";
  const d = BRIEF_BY_DOMAIN[domain] || genericBrief();
  const competitorList = d.competitors.map((c) => c.name).join(", ");

  return {
    id: "brief-competitive",
    name: `${name} — Competitive Position`,
    advertiserId: advertiser.id,
    generatedAt: now,
    marketPosition: section(
      "Market position",
      `${name} sits in the ${d.marketPosition}.`,
      `Synthesized from public web traffic and category share for ${domain} vs ${competitorList}. ${name}'s ${d.marketPositionWhy}.`,
      "medium"
    ),
    topCompetitors: {
      ...section(
        "Top competitors",
        `${competitorList} — by estimated traffic share`,
        "Estimated share of category traffic from public web signals; trend is vs prior 90 days.",
        "medium"
      ),
      data: d.competitors,
    },
    messagingAngles: section("Messaging angles", d.messaging, d.messagingWhy, "medium"),
    whereToWin: section("Where to win", d.whereToWin, d.whereToWinWhy, "high"),
    createdAt: now,
    lastModifiedAt: now,
    lastModifiedBy: "system",
  };
}
