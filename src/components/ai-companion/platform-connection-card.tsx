"use client";

import { useState, useCallback } from "react";
import { Check, Loader2, ExternalLink, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformInfo {
  id: string;
  label: string;
  detail: string;
  /** Brand color for the icon dot */
  color: string;
}

const ALL_PLATFORMS: PlatformInfo[] = [
  { id: "google-ads", label: "Google Ads", detail: "Search, Display, YouTube", color: "#4285F4" },
  { id: "meta-ads", label: "Meta Ads", detail: "Facebook, Instagram", color: "#0081FB" },
  { id: "tiktok-ads", label: "TikTok Ads", detail: "In-feed, TopView", color: "#000000" },
  { id: "linkedin-ads", label: "LinkedIn Ads", detail: "Sponsored Content, InMail", color: "#0A66C2" },
  { id: "shopify", label: "Shopify", detail: "E-commerce storefront", color: "#96BF48" },
  { id: "ga4", label: "GA4", detail: "Web analytics", color: "#E37400" },
];

type ConnectionState = "idle" | "connecting" | "connected";

interface PlatformConnectionCardProps {
  /** Optional subset of platform IDs to show. If omitted, shows all. */
  platformIds?: string[];
  onDone: (connectedIds: string[]) => void;
}

export function PlatformConnectionCard({
  platformIds,
  onDone,
}: PlatformConnectionCardProps) {
  const platforms = platformIds && platformIds.length > 0
    ? ALL_PLATFORMS.filter((p) => platformIds.includes(p.id))
    : ALL_PLATFORMS;

  const [states, setStates] = useState<Record<string, ConnectionState>>(() => {
    const init: Record<string, ConnectionState> = {};
    for (const p of platforms) {
      init[p.id] = "idle";
    }
    return init;
  });

  const connectedCount = platforms.filter((p) => states[p.id] === "connected").length;
  const anyConnecting = platforms.some((p) => states[p.id] === "connecting");
  const hasAtLeastOne = connectedCount > 0;

  const handleConnect = useCallback(
    (platformId: string) => {
      setStates((prev) => ({ ...prev, [platformId]: "connecting" }));

      // Simulate OAuth redirect + token exchange
      const delay = 1200 + Math.random() * 1300;
      setTimeout(() => {
        setStates((prev) => ({ ...prev, [platformId]: "connected" }));
      }, delay);
    },
    []
  );

  const handleConnectAll = useCallback(() => {
    const idle = platforms.filter((p) => states[p.id] === "idle");
    idle.forEach((p, i) => {
      setTimeout(() => handleConnect(p.id), i * 400);
    });
  }, [platforms, states, handleConnect]);

  const handleContinue = useCallback(() => {
    const connected = platforms.filter((p) => states[p.id] === "connected").map((p) => p.id);
    onDone(connected);
  }, [platforms, states, onDone]);

  return (
    <div className="w-full overflow-hidden rounded-[20px] bg-white shadow-[0px_1px_6px_rgba(71,88,114,0.08),0px_7px_14px_rgba(71,88,114,0.08)]">
      {/* Header */}
      <div className="px-5 pb-1 pt-4">
        <span className="text-[14px] font-semibold text-[#394859] leading-[22px]">
          Connect your accounts
        </span>
        <p className="text-[12px] text-[#8492A6] leading-[18px] mt-0.5">
          Connect the platforms you use. You can always add more later.
        </p>
      </div>

      {/* Platform rows */}
      <div className="flex flex-col pt-2 pb-1">
        {platforms.map((meta) => {
          const state = states[meta.id] || "idle";

          return (
            <div
              key={meta.id}
              className="flex items-center gap-3 border-t border-[#EDF1F5] px-5 py-3"
            >
              {/* Platform brand dot */}
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${meta.color}15` }}
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
              </div>

              {/* Platform info */}
              <div className="flex flex-1 flex-col min-w-0">
                <span className="text-[14px] font-medium text-[#394859] leading-[20px]">
                  {meta.label}
                </span>
                <span className="text-[11px] text-[#8492A6] leading-[16px]">
                  {meta.detail}
                </span>
              </div>

              {/* Connection button / state */}
              {state === "idle" && (
                <button
                  onClick={() => handleConnect(meta.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#D5DDE5] px-3 py-1.5 text-[12px] font-medium text-[#394859] transition-colors hover:bg-[#F7F9FB] hover:border-[#BFCCD9]"
                >
                  <ExternalLink className="h-3 w-3" />
                  Connect
                </button>
              )}
              {state === "connecting" && (
                <div className="flex items-center gap-1.5 rounded-lg border border-[#E0E8F2] px-3 py-1.5 text-[12px] text-[#8492A6]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Authorizing...
                </div>
              )}
              {state === "connected" && (
                <div className="flex items-center gap-1.5 rounded-lg border border-[#D1FAE5] bg-[#ECFDF5] px-3 py-1.5 text-[12px] font-medium text-[#065F46]">
                  <Check className="h-3 w-3" />
                  Connected
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-[#EDF1F5] px-5 py-3 flex items-center gap-2">
        {!hasAtLeastOne ? (
          <>
            {platforms.filter((p) => states[p.id] === "idle").length > 1 && (
              <button
                onClick={handleConnectAll}
                className="flex items-center gap-1.5 text-[12px] font-medium text-[#2C9FDD] transition-colors hover:text-[#1A7BB5]"
              >
                Connect all
              </button>
            )}
            <span className="flex-1" />
            <span className="text-[11px] text-[#8492A6]">
              Connect at least one platform to continue
            </span>
          </>
        ) : (
          <button
            onClick={handleContinue}
            disabled={anyConnecting}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[14px] font-medium transition-colors",
              anyConnecting
                ? "bg-[#E0E8F2] text-[#8492A6] cursor-not-allowed"
                : "bg-[#394859] text-white hover:bg-[#2A3744]"
            )}
          >
            Continue with {connectedCount} platform{connectedCount !== 1 ? "s" : ""}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
