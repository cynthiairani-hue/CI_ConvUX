"use client";

import { useState, useCallback } from "react";
import {
  Check,
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  DollarSign,
  PieChart,
  AlertOctagon,
  Lightbulb,
  ShieldCheck,
  FileDown,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CFONarrative,
  CFONarrativeSectionKey,
  StrategySection,
  ReadinessState,
} from "@/types/campaign";
import { SEED_PERFORMANCE, type SeedMonthlyPerformance } from "@/data/seed-company";

interface CFONarrativeCardProps {
  narrative: CFONarrative;
  seedData?: SeedMonthlyPerformance[];
  /** When true, hides Export PDF + status badge from card header (page header renders them instead) */
  hideHeaderActions?: boolean;
  onSendToCFO?: () => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ReadinessBadge({ state }: { state: ReadinessState }) {
  if (state === "ready")
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
        <Check className="h-3 w-3" /> Ready
      </span>
    );
  if (state === "limited")
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">
        <AlertTriangle className="h-3 w-3" /> Limited
      </span>
    );
  return (
    <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-500">
      <XCircle className="h-3 w-3" /> Blocked
    </span>
  );
}

const sectionIcons: Record<CFONarrativeSectionKey, typeof DollarSign> = {
  spendByChannel: DollarSign,
  attributionByChannel: PieChart,
  whatChanged: AlertOctagon,
  recommendedNextMoves: Lightbulb,
  confidenceSummary: ShieldCheck,
};

const CFO_SECTION_KEYS: CFONarrativeSectionKey[] = [
  "spendByChannel",
  "attributionByChannel",
  "whatChanged",
  "recommendedNextMoves",
  "confidenceSummary",
];

function SpendTable({ narrative, perfData }: { narrative: CFONarrative; perfData: SeedMonthlyPerformance[] }) {
  const monthStr = `${narrative.period.year}-${String(narrative.period.month).padStart(2, "0")}`;
  const prevMonthNum = narrative.period.month === 1 ? 12 : narrative.period.month - 1;
  const prevYear = narrative.period.month === 1 ? narrative.period.year - 1 : narrative.period.year;
  const prevMonthStr = `${prevYear}-${String(prevMonthNum).padStart(2, "0")}`;

  const current = perfData.find((p) => p.month === monthStr);
  const prev = perfData.find((p) => p.month === prevMonthStr);

  if (!current) return null;

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-border">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-border bg-muted">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Channel</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Spend</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">% of Total</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Δ MoM</th>
          </tr>
        </thead>
        <tbody>
          {current.channels.map((ch) => {
            const prevCh = prev?.channels.find((c) => c.id === ch.id);
            const delta = prevCh
              ? ((ch.monthlySpend - prevCh.monthlySpend) / prevCh.monthlySpend) * 100
              : 0;
            const pct = ((ch.monthlySpend / current.totalSpend) * 100).toFixed(0);
            return (
              <tr key={ch.id} className="border-b border-border last:border-b-0">
                <td className="px-3 py-2 font-medium text-foreground">
                  <div className="flex items-center gap-1.5">
                    {ch.status === "anomaly" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    )}
                    {ch.status === "watch" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    )}
                    {ch.status === "healthy" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                    {ch.name}
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  ${ch.monthlySpend.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {pct}%
                </td>
                <td className={cn(
                  "px-3 py-2 text-right tabular-nums",
                  delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-muted-foreground"
                )}>
                  {delta > 0 ? "+" : ""}{Math.round(delta)}%
                </td>
              </tr>
            );
          })}
          <tr className="bg-muted">
            <td className="px-3 py-2 font-semibold text-foreground">Total</td>
            <td className="px-3 py-2 text-right tabular-nums font-semibold text-foreground">
              ${current.totalSpend.toLocaleString()}
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">100%</td>
            <td className={cn(
              "px-3 py-2 text-right tabular-nums",
              prev ? (
                current.totalSpend > prev.totalSpend ? "text-emerald-600" :
                current.totalSpend < prev.totalSpend ? "text-red-500" : "text-muted-foreground"
              ) : "text-muted-foreground"
            )}>
              {prev ? `${current.totalSpend > prev.totalSpend ? "+" : ""}${Math.round(((current.totalSpend - prev.totalSpend) / prev.totalSpend) * 100)}%` : "—"}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function AttributionTable({ narrative, perfData }: { narrative: CFONarrative; perfData: SeedMonthlyPerformance[] }) {
  const monthStr = `${narrative.period.year}-${String(narrative.period.month).padStart(2, "0")}`;
  const current = perfData.find((p) => p.month === monthStr);

  if (!current) return null;

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-border">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-border bg-muted">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Channel</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Conversions</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">CPA</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">ROAS</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Revenue %</th>
          </tr>
        </thead>
        <tbody>
          {current.channels.map((ch) => {
            const revenueShare = (ch.attributedRevenuePercent / 100) * current.totalRevenue;
            const roas = revenueShare / ch.monthlySpend;
            return (
              <tr key={ch.id} className="border-b border-border last:border-b-0">
                <td className="px-3 py-2 font-medium text-foreground">{ch.name}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{ch.conversions}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">${ch.cpa}</td>
                <td className={cn(
                  "px-3 py-2 text-right tabular-nums",
                  roas >= 3 ? "text-emerald-600 font-medium" : roas >= 1.5 ? "text-foreground" : "text-amber-600"
                )}>
                  {roas.toFixed(1)}x
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{ch.attributedRevenuePercent}%</td>
              </tr>
            );
          })}
          <tr className="bg-muted">
            <td className="px-3 py-2 font-semibold text-foreground">Total</td>
            <td className="px-3 py-2 text-right tabular-nums font-semibold text-foreground">{current.totalConversions}</td>
            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">—</td>
            <td className="px-3 py-2 text-right tabular-nums font-semibold text-foreground">
              {(current.totalRevenue / current.totalSpend).toFixed(1)}x
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">100%</td>
          </tr>
        </tbody>
      </table>
      <div className="border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
        Attribution: Shapley-derived, 90-day lookback window
      </div>
    </div>
  );
}

function BulletList({ text, variant }: { text: string; variant: "changes" | "moves" }) {
  const lines = text.split("\n").filter(Boolean);
  return (
    <div className="mt-2 space-y-2">
      {lines.map((line, i) => {
        const isWarning = line.startsWith("⚠");
        const isNumbered = /^\d+\./.test(line);
        const cleanLine = isNumbered ? line.replace(/^\d+\.\s*/, "") : line;

        return (
          <div key={i} className="flex items-start gap-2 text-[12px] leading-relaxed">
            {variant === "changes" ? (
              <span className={cn(
                "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                isWarning ? "bg-red-500" : "bg-muted-foreground/40"
              )} />
            ) : (
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                {i + 1}
              </span>
            )}
            <span className={cn(
              "text-foreground",
              isWarning && "font-medium"
            )}>
              {isWarning ? cleanLine.replace("⚠ ", "") : cleanLine}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ConfidenceBadges({ text }: { text: string }) {
  const lines = text.split("\n").filter(Boolean);
  return (
    <div className="mt-2 space-y-2">
      {lines.map((line, i) => {
        const isHigh = line.toLowerCase().includes("high confidence");
        const isMedium = line.toLowerCase().includes("medium confidence");
        const isData = line.toLowerCase().includes("data through");
        return (
          <div key={i} className="flex items-start gap-2 text-[12px] leading-relaxed">
            {isHigh && (
              <span className="mt-0.5 shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                High
              </span>
            )}
            {isMedium && (
              <span className="mt-0.5 shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                Medium
              </span>
            )}
            {isData && (
              <span className="mt-0.5 shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                Fresh
              </span>
            )}
            <span className="text-foreground">{line}</span>
          </div>
        );
      })}
    </div>
  );
}

function exportToPDF(narrative: CFONarrative) {
  const monthLabel = MONTH_NAMES[narrative.period.month - 1];
  const sections: { label: string; value: string }[] = CFO_SECTION_KEYS.map((key) => ({
    label: narrative[key].label,
    value: narrative[key].value,
  }));

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${narrative.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #394859; line-height: 1.6; }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: #8492A6; margin-bottom: 32px; }
    h2 { font-size: 14px; font-weight: 600; margin-top: 24px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #EDF1F5; }
    .section-content { font-size: 13px; white-space: pre-wrap; margin-bottom: 16px; }
    .provenance { font-size: 11px; color: #8492A6; font-style: italic; margin-top: 4px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #EDF1F5; font-size: 11px; color: #8492A6; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>${narrative.name}</h1>
  <div class="subtitle">${narrative.advertiserId} · ${monthLabel} ${narrative.period.year} · Generated ${new Date(narrative.createdAt).toLocaleDateString()}</div>
  ${sections.map((s) => `
  <h2>${s.label}</h2>
  <div class="section-content">${s.value}</div>
  `).join("")}
  <div class="footer">
    Generated by FuseIQ · ${new Date().toLocaleDateString()} · All data sourced from platform with provenance tracked per section
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }
}

export function CFONarrativeCard({ narrative, seedData, hideHeaderActions, onSendToCFO }: CFONarrativeCardProps) {
  const perfData = seedData || SEED_PERFORMANCE;
  const [expandedSections, setExpandedSections] = useState<Set<CFONarrativeSectionKey>>(
    () => new Set<CFONarrativeSectionKey>(["spendByChannel", "attributionByChannel"])
  );
  const [showRationale, setShowRationale] = useState<CFONarrativeSectionKey | null>(null);

  const toggleExpand = useCallback((key: CFONarrativeSectionKey) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const sections: { key: CFONarrativeSectionKey; section: StrategySection }[] = CFO_SECTION_KEYS.map((key) => ({
    key,
    section: narrative[key],
  }));

  const monthLabel = MONTH_NAMES[narrative.period.month - 1];

  const statusLabel = narrative.status === "draft" ? "Draft" : "Final";
  const statusColor = narrative.status === "draft"
    ? "bg-muted text-muted-foreground"
    : "bg-emerald-50 text-emerald-600";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold text-foreground truncate">
            {narrative.name}
          </h3>
          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground">
            <span>{narrative.advertiserId}</span>
            <span>·</span>
            <span>{monthLabel} {narrative.period.year}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!hideHeaderActions && (
            <>
              <button
                type="button"
                onClick={() => exportToPDF(narrative)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
              >
                <FileDown className="h-3.5 w-3.5" />
                Export PDF
              </button>
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", statusColor)}>
                {statusLabel}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Sections */}
      {sections.map(({ key, section }) => {
        const isExpanded = expandedSections.has(key);
        const showingRationale = showRationale === key;
        const Icon = sectionIcons[key];

        return (
          <div key={key} className="border-b border-border last:border-b-0">
            {/* Section header row */}
            <div className="flex items-center gap-2 px-4 py-2.5">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-[13px] font-medium text-foreground min-w-0">
                {section.label}
              </span>
              <ReadinessBadge state={section.readiness} />
              <button
                type="button"
                onClick={() => setShowRationale(showingRationale ? null : key)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-accent hover:text-muted-foreground"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => toggleExpand(key)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-accent hover:text-muted-foreground"
              >
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Rationale / Provenance */}
            {showingRationale && (
              <div className="mx-4 mb-2 rounded-lg bg-accent px-3 py-2 text-[12px] text-muted-foreground leading-relaxed">
                {section.provenance.confidence && (
                  <span className={cn(
                    "mr-2 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    section.provenance.confidence === "high" ? "bg-emerald-50 text-emerald-600" :
                    section.provenance.confidence === "medium" ? "bg-amber-50 text-amber-600" :
                    "bg-red-50 text-red-500"
                  )}>
                    {section.provenance.confidence} confidence
                  </span>
                )}
                {section.provenance.reasoning}
              </div>
            )}

            {/* Section value — summary line when collapsed */}
            {!isExpanded && (
              <div className="px-4 pb-2.5 pl-10 text-[13px] text-muted-foreground leading-relaxed truncate">
                {section.value.split("\n")[0]}
              </div>
            )}

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-border px-4 pb-3 pt-2 pl-10">
                {key === "spendByChannel" && <SpendTable narrative={narrative} perfData={perfData} />}
                {key === "attributionByChannel" && <AttributionTable narrative={narrative} perfData={perfData} />}
                {key === "whatChanged" && <BulletList text={section.value} variant="changes" />}
                {key === "recommendedNextMoves" && <BulletList text={section.value} variant="moves" />}
                {key === "confidenceSummary" && <ConfidenceBadges text={section.value} />}
              </div>
            )}
          </div>
        );
      })}

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between">
          {onSendToCFO && narrative.status === "draft" && (
            <button
              type="button"
              onClick={onSendToCFO}
              className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-foreground/90"
            >
              <Send className="h-3.5 w-3.5" />
              Send to CFO
            </button>
          )}
          {narrative.status === "final" && (
            <span className="flex items-center gap-1.5 text-[12px] text-emerald-600">
              <Check className="h-3.5 w-3.5" />
              Finalized
            </span>
          )}
          <span className="text-[11px] text-muted-foreground/40">
            Generated {new Date(narrative.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
