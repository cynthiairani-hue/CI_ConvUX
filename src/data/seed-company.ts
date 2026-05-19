/**
 * Seed company for the FuseIQ Vision Prototype demo state.
 *
 * Norwest Analytics is a mid-market B2B SaaS company (data observability platform).
 * Sarah Chen is VP Marketing, reporting to CEO, presenting monthly to CFO.
 * Five channels, ~$180K monthly marketing spend, three months of plausible data.
 *
 * The numbers and trends here are the seed for:
 *  - The CFO Narrative artifact (Phase 8C)
 *  - The Orientation artifact (Phase 8D)
 *  - The decision-memory provenance moment (Phase 8E)
 *
 * Internally consistent: channel spends sum to monthly total, anomalies map to
 * recommended next moves, attribution adds to 100%.
 */

export interface SeedChannel {
  id: string;
  name: string;
  monthlySpend: number;
  cpa: number;
  conversions: number;
  attributedRevenuePercent: number;
  trend: "up" | "down" | "flat";
  trendPercent: number;
  status: "healthy" | "watch" | "anomaly";
  note?: string;
}

export interface SeedMonthlyPerformance {
  month: string; // "2026-03", "2026-04", "2026-05"
  totalSpend: number;
  totalRevenue: number;
  totalConversions: number;
  channels: SeedChannel[];
}

export interface SeedAnomaly {
  id: string;
  channel: string;
  detectedAt: string; // ISO date
  description: string;
  rootCause: string;
  confidence: "high" | "medium" | "low";
  recommendedAction: string;
}

export interface SeedUpcomingDecision {
  id: string;
  title: string;
  context: string;
  options: { label: string; rationale: string; expectedImpact: string }[];
  dueDate: string; // ISO date
}

export const SEED_COMPANY = {
  companyName: "Norwest Analytics",
  websiteUrl: "norwestanalytics.com",
  industry: "B2B SaaS — Data Observability",
  arr: 47_000_000,
  teamSize: 5,
  primaryUser: {
    name: "Sarah Chen",
    role: "VP Marketing",
    reportsTo: "CEO",
    presentsTo: "CFO (monthly)",
  },
  brandColors: { primary: "#1F4E5F", accent: "#F7B538" },
};

export const SEED_PERFORMANCE: SeedMonthlyPerformance[] = [
  {
    month: "2026-03",
    totalSpend: 178_400,
    totalRevenue: 612_000,
    totalConversions: 198,
    channels: [
      {
        id: "paid-social",
        name: "Paid Social",
        monthlySpend: 52_000,
        cpa: 287,
        conversions: 64,
        attributedRevenuePercent: 28,
        trend: "flat",
        trendPercent: 1,
        status: "healthy",
      },
      {
        id: "search",
        name: "Paid Search",
        monthlySpend: 48_000,
        cpa: 312,
        conversions: 54,
        attributedRevenuePercent: 31,
        trend: "up",
        trendPercent: 4,
        status: "healthy",
      },
      {
        id: "display",
        name: "Display & Retargeting",
        monthlySpend: 28_400,
        cpa: 410,
        conversions: 32,
        attributedRevenuePercent: 14,
        trend: "flat",
        trendPercent: 0,
        status: "healthy",
      },
      {
        id: "ctv",
        name: "CTV",
        monthlySpend: 30_000,
        cpa: 528,
        conversions: 28,
        attributedRevenuePercent: 17,
        trend: "up",
        trendPercent: 8,
        status: "watch",
        note: "New channel, ramping",
      },
      {
        id: "email",
        name: "Email & Nurture",
        monthlySpend: 20_000,
        cpa: 96,
        conversions: 20,
        attributedRevenuePercent: 10,
        trend: "up",
        trendPercent: 6,
        status: "healthy",
      },
    ],
  },
  {
    month: "2026-04",
    totalSpend: 181_200,
    totalRevenue: 658_000,
    totalConversions: 207,
    channels: [
      {
        id: "paid-social",
        name: "Paid Social",
        monthlySpend: 54_000,
        cpa: 310,
        conversions: 62,
        attributedRevenuePercent: 26,
        trend: "down",
        trendPercent: -5,
        status: "watch",
        note: "CPA creeping up, audience may be saturating",
      },
      {
        id: "search",
        name: "Paid Search",
        monthlySpend: 49_000,
        cpa: 305,
        conversions: 56,
        attributedRevenuePercent: 30,
        trend: "up",
        trendPercent: 3,
        status: "healthy",
      },
      {
        id: "display",
        name: "Display & Retargeting",
        monthlySpend: 28_000,
        cpa: 423,
        conversions: 31,
        attributedRevenuePercent: 13,
        trend: "down",
        trendPercent: -2,
        status: "healthy",
      },
      {
        id: "ctv",
        name: "CTV",
        monthlySpend: 30_200,
        cpa: 467,
        conversions: 32,
        attributedRevenuePercent: 20,
        trend: "up",
        trendPercent: 14,
        status: "healthy",
        note: "Beating forecast",
      },
      {
        id: "email",
        name: "Email & Nurture",
        monthlySpend: 20_000,
        cpa: 91,
        conversions: 26,
        attributedRevenuePercent: 11,
        trend: "up",
        trendPercent: 4,
        status: "healthy",
      },
    ],
  },
  {
    month: "2026-05",
    totalSpend: 183_800,
    totalRevenue: 691_000,
    totalConversions: 213,
    channels: [
      {
        id: "paid-social",
        name: "Paid Social",
        monthlySpend: 55_500,
        cpa: 342,
        conversions: 58,
        attributedRevenuePercent: 24,
        trend: "down",
        trendPercent: -10,
        status: "anomaly",
        note: "CAC up 18% over 30 days. Likely audience expansion test from May 4.",
      },
      {
        id: "search",
        name: "Paid Search",
        monthlySpend: 49_300,
        cpa: 298,
        conversions: 60,
        attributedRevenuePercent: 31,
        trend: "up",
        trendPercent: 2,
        status: "healthy",
      },
      {
        id: "display",
        name: "Display & Retargeting",
        monthlySpend: 27_500,
        cpa: 431,
        conversions: 30,
        attributedRevenuePercent: 12,
        trend: "flat",
        trendPercent: -1,
        status: "healthy",
      },
      {
        id: "ctv",
        name: "CTV",
        monthlySpend: 31_500,
        cpa: 412,
        conversions: 38,
        attributedRevenuePercent: 22,
        trend: "up",
        trendPercent: 12,
        status: "healthy",
        note: "Sustained outperformance. Candidate for budget shift.",
      },
      {
        id: "email",
        name: "Email & Nurture",
        monthlySpend: 20_000,
        cpa: 87,
        conversions: 27,
        attributedRevenuePercent: 11,
        trend: "flat",
        trendPercent: 1,
        status: "healthy",
      },
    ],
  },
];

export const SEED_ANOMALIES: SeedAnomaly[] = [
  {
    id: "anomaly-paid-social-cac",
    channel: "Paid Social",
    detectedAt: "2026-05-14",
    description:
      "Paid Social CAC up 18% week-over-week. Conversions down 9%. Spend pacing same.",
    rootCause:
      "Audience expansion test launched May 4 widened the targeting to 3 new lookalikes. Top-of-funnel cost rose; mid-funnel conversion didn't keep pace.",
    confidence: "high",
    recommendedAction:
      "Pause the two lowest-performing lookalikes, return budget to the original audience. Expected to recover 12-15% of the CAC drift within 7 days.",
  },
];

export const SEED_UPCOMING_DECISIONS: SeedUpcomingDecision[] = [
  {
    id: "decision-q3-budget",
    title: "Q3 budget allocation across channels",
    context:
      "Q3 starts July 1. Current monthly run rate is $184K. Finance has approved $570K for the quarter. CTV has outperformed forecast 14% / 12% the last two months. Paid Social is in a CAC anomaly.",
    options: [
      {
        label: "Hold current mix, monitor",
        rationale:
          "Wait for Paid Social anomaly to resolve before reallocating.",
        expectedImpact: "Neutral. Maintains optionality but doesn't capture CTV momentum.",
      },
      {
        label: "Shift $15K/mo from Paid Social to CTV",
        rationale:
          "CTV CAC ($412) is now lower than Paid Social CAC ($342 → trending higher). Re-balance toward the winning channel.",
        expectedImpact:
          "Estimated +6-9% conversions at flat spend, based on May trajectory. Confidence: medium.",
      },
      {
        label: "Increase total spend by $20K/mo into CTV and Email",
        rationale:
          "Both channels are below saturation and improving on CPA. Finance has $30K of headroom in Q3 approval.",
        expectedImpact:
          "Estimated +12-15% conversions. Higher risk on the incremental CTV $.",
      },
    ],
    dueDate: "2026-06-15",
  },
];

export const SEED_CFO_MEETING = {
  nextMeetingDate: "2026-05-22", // Friday this week
  recurringCadence: "Monthly, last Friday",
  cfoName: "David Kuroda",
  typicalQuestions: [
    "Which channel is actually driving revenue?",
    "What's the attribution model and how confident are we?",
    "What did we change and what did it cost?",
    "What's the ask for next quarter and what evidence supports it?",
  ],
};
