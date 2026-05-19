import type { CFONarrative, StrategySection } from "@/types/campaign";
import type { SeedMonthlyPerformance, SeedAnomaly } from "./seed-company";
import { SEED_COMPANY } from "./seed-company";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtDollar(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function trendArrow(pct: number): string {
  if (pct > 0) return `↑ ${pct}%`;
  if (pct < 0) return `↓ ${Math.abs(pct)}%`;
  return "→ flat";
}

function makeSection(
  label: string,
  value: string,
  reasoning: string,
  confidence: "high" | "medium" | "low" = "high"
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

export function buildNarrativeFromSeed(
  performance: SeedMonthlyPerformance[],
  anomalies: SeedAnomaly[],
  period: { month: number; year: number }
): CFONarrative {
  const monthStr = `${period.year}-${String(period.month).padStart(2, "0")}`;
  const currentMonth = performance.find((p) => p.month === monthStr);
  const prevMonthNum = period.month === 1 ? 12 : period.month - 1;
  const prevYear = period.month === 1 ? period.year - 1 : period.year;
  const prevMonthStr = `${prevYear}-${String(prevMonthNum).padStart(2, "0")}`;
  const prevMonth = performance.find((p) => p.month === prevMonthStr);

  if (!currentMonth) {
    throw new Error(`No performance data found for ${monthStr}`);
  }

  const monthLabel = MONTH_NAMES[period.month - 1];

  // --- Spend by Channel ---
  const spendLines = currentMonth.channels.map((ch) => {
    const prev = prevMonth?.channels.find((c) => c.id === ch.id);
    const delta = prev
      ? ((ch.monthlySpend - prev.monthlySpend) / prev.monthlySpend) * 100
      : 0;
    const pctOfTotal = ((ch.monthlySpend / currentMonth.totalSpend) * 100).toFixed(0);
    return `${ch.name}: ${fmtDollar(ch.monthlySpend)} (${pctOfTotal}% of total, ${trendArrow(Math.round(delta))} MoM)`;
  });
  const spendValue = `Total spend: ${fmtDollar(currentMonth.totalSpend)}\n${spendLines.join("\n")}`;
  const spendMoM = prevMonth
    ? `${trendArrow(Math.round(((currentMonth.totalSpend - prevMonth.totalSpend) / prevMonth.totalSpend) * 100))} from ${fmtDollar(prevMonth.totalSpend)}`
    : "No prior month data";

  const spendByChannel = makeSection(
    "Spend by Channel",
    spendValue,
    `Channel-level spend for ${monthLabel} ${period.year}. ${spendMoM}. Source: platform billing data, reconciled against finance records.`
  );

  // --- Attribution by Channel ---
  const attrLines = currentMonth.channels.map((ch) => {
    const revenueShare = ((ch.attributedRevenuePercent / 100) * currentMonth.totalRevenue);
    return `${ch.name}: ${fmt(ch.conversions)} conversions, CPA ${fmtDollar(ch.cpa)}, ROAS ${(revenueShare / ch.monthlySpend).toFixed(1)}x, ${ch.attributedRevenuePercent}% of attributed revenue`;
  });
  const attrValue = `Total: ${fmt(currentMonth.totalConversions)} conversions, ${fmtDollar(currentMonth.totalRevenue)} revenue\n${attrLines.join("\n")}`;

  const attributionByChannel: StrategySection = {
    label: "Attribution by Channel",
    value: attrValue,
    provenance: {
      source: "ai_inferred",
      reasoning: `Shapley-derived attribution model, 90-day lookback window. Validated against 1,200+ comparable B2B SaaS accounts on platform. Revenue figures are attributed, not raw.`,
      confidence: "high",
    },
    readiness: "ready",
    editable: true,
    authorshipState: "proposed",
    filled: true,
    editHistory: [],
  };

  // --- What Changed ---
  const changes: string[] = [];

  // Check for anomalies in period
  const periodAnomalies = anomalies.filter((a) => {
    const d = new Date(a.detectedAt);
    return d.getMonth() + 1 === period.month && d.getFullYear() === period.year;
  });

  for (const anomaly of periodAnomalies) {
    changes.push(`⚠ ${anomaly.description} Root cause: ${anomaly.rootCause}`);
  }

  // Check for significant trend changes
  if (prevMonth) {
    for (const ch of currentMonth.channels) {
      const prev = prevMonth.channels.find((c) => c.id === ch.id);
      if (!prev) continue;
      const cpaDelta = ((ch.cpa - prev.cpa) / prev.cpa) * 100;
      if (Math.abs(cpaDelta) > 5 && !periodAnomalies.some((a) => a.channel === ch.name)) {
        const dir = cpaDelta > 0 ? "increased" : "decreased";
        changes.push(`${ch.name} CPA ${dir} ${Math.abs(Math.round(cpaDelta))}% MoM (${fmtDollar(prev.cpa)} → ${fmtDollar(ch.cpa)})`);
      }
      if (ch.status === "healthy" && ch.trend === "up" && ch.trendPercent >= 10) {
        changes.push(`${ch.name} sustaining strong performance (${trendArrow(ch.trendPercent)} trend)${ch.note ? ` — ${ch.note}` : ""}`);
      }
    }

    const revDelta = ((currentMonth.totalRevenue - prevMonth.totalRevenue) / prevMonth.totalRevenue) * 100;
    if (Math.abs(revDelta) > 3) {
      changes.push(`Total attributed revenue ${revDelta > 0 ? "up" : "down"} ${Math.abs(Math.round(revDelta))}% MoM (${fmtDollar(prevMonth.totalRevenue)} → ${fmtDollar(currentMonth.totalRevenue)})`);
    }
  }

  const whatChanged = makeSection(
    "What Changed",
    changes.length > 0 ? changes.join("\n") : "No material changes this period.",
    `Changes detected by comparing ${monthLabel} against prior month and flagging anomalies from platform monitoring. Each change is linked to a root cause where confidence allows.`,
    periodAnomalies.length > 0 ? "high" : "medium"
  );

  // --- Recommended Next Moves ---
  const moves: string[] = [];
  for (const anomaly of periodAnomalies) {
    moves.push(`${anomaly.recommendedAction} (Confidence: ${anomaly.confidence})`);
  }

  // Look for reallocation opportunities
  const sortedByROAS = [...currentMonth.channels].sort((a, b) => {
    const roasA = (a.attributedRevenuePercent / 100 * currentMonth.totalRevenue) / a.monthlySpend;
    const roasB = (b.attributedRevenuePercent / 100 * currentMonth.totalRevenue) / b.monthlySpend;
    return roasB - roasA;
  });
  const topChannel = sortedByROAS[0];
  const bottomChannel = sortedByROAS[sortedByROAS.length - 1];
  if (topChannel && bottomChannel && topChannel.id !== bottomChannel.id) {
    const topROAS = ((topChannel.attributedRevenuePercent / 100 * currentMonth.totalRevenue) / topChannel.monthlySpend).toFixed(1);
    const botROAS = ((bottomChannel.attributedRevenuePercent / 100 * currentMonth.totalRevenue) / bottomChannel.monthlySpend).toFixed(1);
    moves.push(`Consider shifting 10-15% of ${bottomChannel.name} budget (ROAS: ${botROAS}x) to ${topChannel.name} (ROAS: ${topROAS}x). Expected impact: improved blended ROAS. (Confidence: medium)`);
  }

  if (moves.length === 0) {
    moves.push("No urgent actions. Continue monitoring current allocation.");
  }

  const recommendedNextMoves = makeSection(
    "Recommended Next Moves",
    moves.map((m, i) => `${i + 1}. ${m}`).join("\n"),
    `Recommendations derived from anomaly analysis and channel performance comparison. Each recommendation includes expected impact and confidence level.`,
    "medium"
  );

  // --- Confidence Summary ---
  const dataFreshness = "Data through May 18, 2026. Billing data reconciled. Attribution model last calibrated May 1.";
  const highConfSections = ["Spend by Channel", "Attribution by Channel"];
  const medConfSections = ["What Changed", "Recommended Next Moves"];
  const confValue = `High confidence: ${highConfSections.join(", ")} — sourced from platform billing and validated attribution model.\nMedium confidence: ${medConfSections.join(", ")} — anomaly detection is automated but root cause analysis is AI-inferred.\n${dataFreshness}`;

  const confidenceSummary = makeSection(
    "Confidence Summary",
    confValue,
    "Confidence ratings reflect data source reliability, model validation status, and the specificity of causal claims. High = verified data. Medium = inferred with supporting evidence. Low = hypothesis only.",
    "high"
  );

  const now = new Date().toISOString();

  return {
    id: `narrative-${Date.now()}`,
    name: `${monthLabel} ${period.year} Marketing Performance`,
    status: "draft",
    advertiserId: SEED_COMPANY.companyName,
    period,
    spendByChannel,
    attributionByChannel,
    whatChanged,
    recommendedNextMoves,
    confidenceSummary,
    createdAt: now,
    lastModifiedAt: now,
    lastModifiedBy: "system",
  };
}
