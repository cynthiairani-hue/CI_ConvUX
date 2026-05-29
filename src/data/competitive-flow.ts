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

const FFERN_COMPETITORS: CompetitorRow[] = [
  { name: "Le Labo", trafficShare: "24%", trend: "+2 pts", primaryChannel: "Retail + organic" },
  { name: "Byredo", trafficShare: "19%", trend: "−1 pt", primaryChannel: "Paid social" },
  { name: "Diptyque", trafficShare: "17%", trend: "flat", primaryChannel: "Search + retail" },
  { name: "Jo Malone", trafficShare: "15%", trend: "+1 pt", primaryChannel: "Paid social + CTV" },
  { name: "Aesop", trafficShare: "13%", trend: "+3 pts", primaryChannel: "Organic + PR" },
];

export function buildCompetitiveBrief(advertiser: Advertiser): CompetitiveBrief {
  const now = new Date().toISOString();
  const name = advertiser.companyName;
  const domain = advertiser.websiteUrl || "your site";

  const competitorList = FFERN_COMPETITORS.map((c) => c.name).join(", ");

  return {
    id: "brief-competitive",
    name: `${name} — Competitive Position`,
    advertiserId: advertiser.id,
    generatedAt: now,
    marketPosition: section(
      "Market position",
      `${name} sits in the challenger tier of niche luxury fragrance — strong brand affinity, smaller paid footprint than the category leaders.`,
      `Synthesized from public web traffic and category share for ${domain} vs ${competitorList}. ${name}'s owned/organic strength outpaces its paid presence, leaving headroom in paid awareness.`,
      "medium"
    ),
    topCompetitors: {
      ...section(
        "Top competitors",
        `${competitorList} — by estimated traffic share`,
        "Estimated share of category traffic from public web signals; trend is vs prior 90 days.",
        "medium"
      ),
      data: FFERN_COMPETITORS,
    },
    messagingAngles: section(
      "Messaging angles",
      "Competitors lead on heritage and scent-craft; few own sustainability + seasonal-ritual storytelling.",
      "Messaging analysis of competitor sites and ads. Le Labo/Diptyque anchor on craft heritage; Byredo on art-direction; none strongly own the seasonal-waitlist ritual that is core to Ffern.",
      "medium"
    ),
    whereToWin: section(
      "Where to win",
      "CTV awareness on the seasonal ritual; sustainability proof points; defend branded search.",
      "Competitors under-invest in CTV — a premium awareness channel where Ffern's cinematic assets stand out. Pair with sustainability messaging (white space) and protect branded search from Byredo/Jo Malone conquesting.",
      "high"
    ),
    createdAt: now,
    lastModifiedAt: now,
    lastModifiedBy: "system",
  };
}
