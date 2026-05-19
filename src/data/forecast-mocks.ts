import type { PlacementType, AudienceData, ForecastEstimate } from "@/types/campaign";

const CPM_BY_PLACEMENT: Record<PlacementType, number> = {
  display: 4.50,
  video: 12.00,
  "ctv-ott": 25.00,
  native: 8.00,
  audio: 10.00,
  dooh: 15.00,
  "in-app": 6.00,
  "rich-media": 9.00,
};

const REACH_RATIO_BY_PLACEMENT: Record<PlacementType, number> = {
  display: 0.65,
  video: 0.45,
  "ctv-ott": 0.30,
  native: 0.50,
  audio: 0.35,
  dooh: 0.80,
  "in-app": 0.55,
  "rich-media": 0.40,
};

function estimateAudienceSize(audience: AudienceData): number {
  let base = 2_000_000;
  base *= audience.locations.length || 1;
  if (audience.marketInterests.length > 3) base *= 0.6;
  if (audience.gender !== "all") base *= 0.5;
  const ageSpan = audience.ageRange.max - audience.ageRange.min;
  base *= Math.min(ageSpan / 50, 1);
  return Math.round(base);
}

export function generateForecast(
  dailyBudget: number,
  placements: PlacementType[],
  audience: AudienceData
): ForecastEstimate {
  if (placements.length === 0 || dailyBudget <= 0) {
    return {
      weeklyReach: 0,
      dailyReach: 0,
      weeklyImpressions: 0,
      dailyImpressions: 0,
      estimatedHouseholds: 0,
      confidenceLevel: "low",
    };
  }

  const audienceSize = estimateAudienceSize(audience);
  const budgetPerPlacement = dailyBudget / placements.length;

  let totalDailyImpressions = 0;
  let totalDailyReach = 0;

  for (const p of placements) {
    const cpm = CPM_BY_PLACEMENT[p];
    const impressions = (budgetPerPlacement / cpm) * 1000;
    const reach = impressions * REACH_RATIO_BY_PLACEMENT[p];
    totalDailyImpressions += impressions;
    totalDailyReach += reach;
  }

  totalDailyReach = Math.min(totalDailyReach, audienceSize * 0.02);

  const households = Math.round(totalDailyReach * 0.6);

  let confidenceLevel: ForecastEstimate["confidenceLevel"] = "medium";
  if (dailyBudget >= 100 && placements.length >= 2) confidenceLevel = "high";
  else if (dailyBudget < 30 || placements.length < 2) confidenceLevel = "low";

  return {
    dailyReach: Math.round(totalDailyReach),
    weeklyReach: Math.round(totalDailyReach * 6.2),
    dailyImpressions: Math.round(totalDailyImpressions),
    weeklyImpressions: Math.round(totalDailyImpressions * 7),
    estimatedHouseholds: households,
    confidenceLevel,
  };
}
