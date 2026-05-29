"use client";

import { Check, Globe, Swords, MessageSquare, Trophy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompetitiveBrief } from "@/types/campaign";

interface CompetitiveBriefCardProps {
  brief: CompetitiveBrief;
  /** Simulated connect action — drives the PLG pixel-install hook. */
  onConnectPixel?: () => void;
}

function ReadyBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
      <Check className="h-3 w-3" /> Ready
    </span>
  );
}

function SectionShell({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="text-muted-foreground">{icon}</span>
        <span className="flex-1 text-[13px] font-medium text-foreground">{label}</span>
        <ReadyBadge />
      </div>
      <div className="border-t border-border px-4 pb-4 pt-3">{children}</div>
    </div>
  );
}

export function CompetitiveBriefCard({ brief, onConnectPixel }: CompetitiveBriefCardProps) {
  return (
    <div className="space-y-4">
      {/* Provenance strip */}
      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        Pulled from SimilarWeb + public web · no pixel required
      </div>

      {/* Market position */}
      <SectionShell icon={<Globe className="h-4 w-4" />} label="Market position">
        <p className="text-[13px] leading-relaxed text-foreground">{brief.marketPosition.value}</p>
        <p className="mt-1.5 text-[12px] text-muted-foreground">{brief.marketPosition.provenance.reasoning}</p>
      </SectionShell>

      {/* Top competitors — table */}
      <SectionShell icon={<Swords className="h-4 w-4" />} label="Top competitors">
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Competitor</th>
                <th className="px-3 py-2 text-right font-medium">Traffic share</th>
                <th className="px-3 py-2 text-right font-medium">Trend</th>
                <th className="px-3 py-2 text-left font-medium">Primary channel</th>
              </tr>
            </thead>
            <tbody>
              {brief.topCompetitors.data.map((c) => (
                <tr key={c.name} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2 font-medium text-foreground">{c.name}</td>
                  <td className="px-3 py-2 text-right text-foreground">{c.trafficShare}</td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right",
                      c.trend.startsWith("+") ? "text-emerald-600" : c.trend.startsWith("−") ? "text-red-500" : "text-muted-foreground"
                    )}
                  >
                    {c.trend}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{c.primaryChannel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">{brief.topCompetitors.provenance.reasoning}</p>
      </SectionShell>

      {/* Messaging angles */}
      <SectionShell icon={<MessageSquare className="h-4 w-4" />} label="Messaging angles">
        <p className="text-[13px] leading-relaxed text-foreground">{brief.messagingAngles.value}</p>
        <p className="mt-1.5 text-[12px] text-muted-foreground">{brief.messagingAngles.provenance.reasoning}</p>
      </SectionShell>

      {/* Where to win — emphasized */}
      <SectionShell icon={<Trophy className="h-4 w-4" />} label="Where to win">
        <p className="text-[13px] font-medium leading-relaxed text-foreground">{brief.whereToWin.value}</p>
        <p className="mt-1.5 text-[12px] text-muted-foreground">{brief.whereToWin.provenance.reasoning}</p>
      </SectionShell>

      {/* PLG hook — pixel install */}
      <div className="rounded-xl border border-[#2C9FDD]/30 bg-[#EBF5FB]/60 px-4 py-4">
        <p className="text-[13px] font-medium text-foreground">Track competitors continuously</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Connect your site pixel to monitor share shifts, get alerts when a competitor moves, and unlock conquesting audiences.
        </p>
        <button
          type="button"
          onClick={onConnectPixel}
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-foreground/90"
        >
          Connect your site pixel
        </button>
      </div>
    </div>
  );
}
