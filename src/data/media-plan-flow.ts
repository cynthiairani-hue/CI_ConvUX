import type {
  Advertiser,
  FunnelStage,
  IABIndustry,
  MediaCampaign,
  MediaChannelKey,
  MediaForecast,
  MediaPlan,
} from "@/types/campaign";
import { getCapabilities } from "./prerequisites";
import { getClientAnchor } from "./client-data";

/**
 * Media Plan builder + single-source recalc engine.
 *
 * Mirrors the AdRoll Media Planner spec's behaviour: 5 channels grouped
 * Awareness → Consideration → Conversion, each an editable budget row with its
 * own forecast. The spec's hardcoded prototype had THREE disagreeing number
 * sources (headline 5,380 vs recalc 4,580 vs chat 5,510); we deliberately fix
 * that — there is ONE source of truth:
 *   summary.estConversions === Σ enabled campaign.forecast.conversions
 *   blended ROAS = Σ revenue / Σ spend   (a real ratio, not "rises with spend")
 *
 * Both inline canvas edits and AI chat refinements run the SAME recalc, so the
 * card and the narration can never diverge (two modalities, one artifact).
 */

const TEMPLATE_TOTAL = 120_000;

/** Channel template at the $120k reference budget (mirrors the spec's worked example). */
const CHANNEL_TEMPLATE: Omit<MediaCampaign, "forecast">[] = [
  {
    id: "mc-ctv",
    channel: "ctv",
    label: "Connected TV (CTV)",
    description: "Brand awareness via premium streaming",
    funnelStage: "awareness",
    status: "available",
    budget: 12_000,
    baseBudget: 12_000,
    enabled: true,
    baseForecast: { impressions: 2_400_000, conversions: 0, roas: null, cpa: null, vtr: 82, brandLift: 18, cpm: 5 },
  },
  {
    id: "mc-dooh",
    channel: "dooh",
    label: "Digital Out-of-Home (DOOH)",
    description: "Geo-targeted high-traffic markets",
    funnelStage: "awareness",
    status: "closed_beta",
    budget: 8_000,
    baseBudget: 8_000,
    enabled: true,
    baseForecast: { impressions: 1_300_000, conversions: 0, roas: null, cpa: null, cpm: 6, markets: 8, audiencePool: 22_000 },
  },
  {
    id: "mc-lookalike",
    channel: "lookalike",
    label: "Lookalike Prospecting",
    description: "Find new customers at scale",
    funnelStage: "consideration",
    status: "available",
    budget: 38_000,
    baseBudget: 38_000,
    enabled: true,
    baseForecast: { impressions: 7_600_000, conversions: 1_267, roas: 2.8, cpa: 30 },
  },
  {
    id: "mc-social",
    channel: "social",
    label: "Social — Meta & Instagram",
    description: "Awareness + DTC conversion",
    funnelStage: "consideration",
    status: "available",
    budget: 30_000,
    baseBudget: 30_000,
    enabled: true,
    baseForecast: { impressions: 5_000_000, conversions: 1_250, roas: 3.4, cpa: 24 },
  },
  {
    id: "mc-retargeting",
    channel: "retargeting",
    label: "Site Retargeting",
    description: "Convert warm visitors",
    funnelStage: "conversion",
    status: "available",
    budget: 32_000,
    baseBudget: 32_000,
    enabled: true,
    baseForecast: { impressions: 3_200_000, conversions: 2_000, roas: 5.0, cpa: 16 },
  },
];

const OBJ_TITLE: Record<string, string> = {
  awareness: "Brand Launch",
  traffic: "Demand Capture",
  leads: "Lead Generation",
  sales: "Conversion Push",
  retargeting: "Retargeting Plan",
};

const VERTICAL_WORD: Partial<Record<IABIndustry, string>> = {
  "style-fashion": "beauty & fashion",
  "technology-computing": "B2B SaaS",
  "business-finance": "finance",
  "healthy-living": "health & wellness",
  "food-drink": "food & beverage",
  travel: "travel",
  automotive: "automotive",
  entertainment: "media & entertainment",
  sports: "sports",
};

function scaleForecast(f: MediaForecast, factor: number): MediaForecast {
  return {
    ...f,
    impressions: Math.round(f.impressions * factor),
    conversions: Math.round(f.conversions * factor),
    audiencePool: f.audiencePool != null ? Math.round(f.audiencePool * factor) : undefined,
  };
}

/** Recompute one campaign's forecast from its current budget (linear from base). */
function recalcForecast(c: MediaCampaign): MediaForecast {
  const scale = c.baseBudget > 0 ? c.budget / c.baseBudget : 0;
  const f = c.baseForecast;
  const conversions = Math.round(f.conversions * scale);
  return {
    ...f,
    impressions: Math.round(f.impressions * scale),
    conversions,
    // ROAS is a per-channel ratio — constant, NOT scaling with spend.
    roas: f.roas,
    cpa: conversions > 0 ? Math.round(c.budget / conversions) : null,
    audiencePool: f.audiencePool != null ? Math.round(f.audiencePool * scale) : undefined,
  };
}

/**
 * The single source of truth: recompute every per-channel forecast, then derive
 * the summary KPIs from the ENABLED campaigns only. Call this after any edit
 * (inline budget change, channel toggle, or AI refine) — never store a separate
 * headline number.
 */
export function recalcMediaPlan(plan: MediaPlan, stampedAt: string = new Date().toISOString()): MediaPlan {
  const campaigns = plan.campaigns.map((c) => ({ ...c, forecast: recalcForecast(c) }));
  const active = campaigns.filter((c) => c.enabled);
  const totalBudget = active.reduce((s, c) => s + c.budget, 0);
  const estConversions = active.reduce((s, c) => s + c.forecast.conversions, 0);
  const estImpressions = active.reduce((s, c) => s + c.forecast.impressions, 0);
  const revenue = active.reduce((s, c) => s + (c.forecast.roas != null ? c.forecast.roas * c.budget : 0), 0);
  const estRoas = totalBudget > 0 ? Math.round((revenue / totalBudget) * 10) / 10 : 0;
  return {
    ...plan,
    campaigns,
    summary: { ...plan.summary, totalBudget, estConversions, estRoas, estImpressions },
    lastModifiedAt: stampedAt,
    lastModifiedBy: "you",
  };
}

/** Inline budget edit → recalc. */
export function editCampaignBudget(plan: MediaPlan, campaignId: string, newBudget: number): MediaPlan {
  const campaigns = plan.campaigns.map((c) =>
    c.id === campaignId ? { ...c, budget: Math.max(0, Math.round(newBudget)) } : c
  );
  return recalcMediaPlan({ ...plan, campaigns });
}

/** Edit the TOTAL budget → rescale enabled channels proportionally, then recalc. */
export function setTotalBudget(plan: MediaPlan, newTotal: number): MediaPlan {
  const target = Math.max(0, Math.round(newTotal));
  const enabled = plan.campaigns.filter((c) => c.enabled);
  const current = enabled.reduce((s, c) => s + c.budget, 0);
  if (current <= 0 || target <= 0) {
    return recalcMediaPlan({ ...plan, summary: { ...plan.summary, totalBudget: target } });
  }
  const factor = target / current;
  const campaigns = plan.campaigns.map((c) =>
    c.enabled ? { ...c, budget: Math.round(c.budget * factor) } : c
  );
  return recalcMediaPlan({ ...plan, campaigns });
}

/** Channel on/off toggle → recalc (disabled channels drop out of the summary). */
export function toggleCampaign(plan: MediaPlan, campaignId: string): MediaPlan {
  const campaigns = plan.campaigns.map((c) =>
    c.id === campaignId ? { ...c, enabled: !c.enabled } : c
  );
  return recalcMediaPlan({ ...plan, campaigns });
}

/**
 * Add a line item by cloning an existing line in the same channel/stage — for
 * a media buy that runs the same channel in multiple markets, each with its own
 * creative (CTV New York, CTV Los Angeles…). Splits the source line's budget in
 * half so the plan total is unchanged, then recalcs. Inserts right after the
 * source line. Returns { plan, newId } so the UI can focus the new row.
 */
export function addCampaignLine(plan: MediaPlan, sourceId: string): { plan: MediaPlan; newId: string } {
  const src = plan.campaigns.find((c) => c.id === sourceId);
  if (!src) return { plan, newId: "" };
  const newId = `${src.channel}-${Math.abs(hashStr(sourceId + plan.campaigns.length + src.budget))}`;
  const half = Math.round(src.budget / 2);
  const clone: MediaCampaign = {
    ...src,
    id: newId,
    budget: src.budget - half, // remainder goes to the new line
    baseBudget: src.budget - half,
    location: "",
    creative: "",
    enabled: true,
  };
  const reduced = { ...src, budget: half, baseBudget: half };
  const campaigns: MediaCampaign[] = [];
  for (const c of plan.campaigns) {
    if (c.id === sourceId) { campaigns.push(reduced, clone); }
    else campaigns.push(c);
  }
  return { plan: recalcMediaPlan({ ...plan, campaigns, aiTouched: undefined }), newId };
}

/** Remove a line item → recalc. */
export function removeCampaign(plan: MediaPlan, campaignId: string): MediaPlan {
  const campaigns = plan.campaigns.filter((c) => c.id !== campaignId);
  return recalcMediaPlan({ ...plan, campaigns, aiTouched: undefined });
}

/** Edit a line's text fields (label/audience/location/creative/keywords) — no
 *  recalc, since none of these change budget. */
export function editCampaignFields(
  plan: MediaPlan,
  campaignId: string,
  fields: { label?: string; audience?: string; location?: string; creative?: string; keywords?: string }
): MediaPlan {
  const campaigns = plan.campaigns.map((c) =>
    c.id === campaignId ? { ...c, ...fields } : c
  );
  return { ...plan, campaigns };
}

/** Channels a user can add a line for (from the channel templates), de-duped. */
export const CHANNEL_OPTIONS: { key: MediaChannelKey; label: string; defaultStage: FunnelStage }[] =
  CHANNEL_TEMPLATE.map((t) => ({ key: t.channel, label: t.label, defaultStage: t.funnelStage }));

/**
 * Add a fresh line item to a flight (funnel stage), choosing its channel. Seeds
 * label/description/forecast from the channel template, starts at a modest
 * budget (added on top of the plan total — the user tunes it inline), recalcs.
 * Returns { plan, newId } so the UI can focus the new row.
 */
export function addBlankLine(plan: MediaPlan, stage: FunnelStage, channel: MediaChannelKey): { plan: MediaPlan; newId: string } {
  const tmpl = CHANNEL_TEMPLATE.find((t) => t.channel === channel) ?? CHANNEL_TEMPLATE[0];
  const startBudget = 5_000;
  const factor = startBudget / Math.max(1, tmpl.baseBudget);
  const baseForecast = scaleForecast(tmpl.baseForecast, factor);
  const newId = `${channel}-${Math.abs(hashStr(channel + stage + plan.campaigns.length))}`;
  const line: MediaCampaign = {
    id: newId,
    channel,
    label: tmpl.label,
    description: tmpl.description,
    funnelStage: stage,
    status: tmpl.status,
    budget: startBudget,
    baseBudget: startBudget,
    enabled: true,
    baseForecast,
    forecast: baseForecast,
    location: "",
    creative: "",
    audience: "",
    keywords: "",
  };
  // Insert after the last line already in that stage (keeps the flight grouped).
  const lastIdxInStage = plan.campaigns.reduce((acc, c, i) => (c.funnelStage === stage ? i : acc), -1);
  const campaigns = [...plan.campaigns];
  campaigns.splice(lastIdxInStage + 1, 0, line);
  return { plan: recalcMediaPlan({ ...plan, campaigns, aiTouched: undefined }), newId };
}

/** Small stable string hash for generating line ids deterministically. */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return h;
}

/* ── Natural-language plan editing ─────────────────────────────────────────
   Makes typed/spoken commands work the same as the refine chips: "change CTV
   budget to 11,458", "shift $10k from DOOH to social", "turn off DOOH",
   "increase retargeting by 5k", "set the total to 90k", "why CTV?". */

const CHANNEL_PATTERNS: { key: MediaChannelKey; re: RegExp }[] = [
  { key: "ctv", re: /\bctv\b|connected\s*tv|\bott\b|streaming/i },
  { key: "dooh", re: /\bdooh\b|out[\s-]?of[\s-]?home|billboard/i },
  { key: "lookalike", re: /lookalike|prospect/i },
  { key: "social", re: /\bsocial\b|meta|instagram|facebook/i },
  { key: "retargeting", re: /retarget|site\s*visitor|warm/i },
];

function matchChannelKey(text: string): MediaChannelKey | null {
  for (const { key, re } of CHANNEL_PATTERNS) if (re.test(text)) return key;
  return null;
}

/** Parse a dollar amount: "$10k" → 10000, "11,458" → 11458, "90k" → 90000. */
function parseAmount(text: string): number | null {
  const m = text.match(/\$?\s*([\d][\d,]*(?:\.\d+)?)\s*(k|m)?/i);
  if (!m) return null;
  let n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] || "").toLowerCase();
  if (unit === "k") n *= 1_000;
  if (unit === "m") n *= 1_000_000;
  return Math.round(n);
}

export const WHY_CHANNEL: Record<MediaChannelKey, string> = {
  ctv: "CTV is a brand play, not a direct-response channel — expect 3–5× better recall and a ~15–20% lift on your co-running retargeting over the flight, but few last-click conversions. That's why it sits in Awareness and reports VTR + brand-lift instead of ROAS.",
  dooh: "DOOH builds physical-world salience in your top markets — strong for awareness and local lift, measured on reach and CPM, not conversions. It's in closed beta, so we activate it manually for you.",
  lookalike: "Lookalike prospecting finds net-new customers who resemble your best buyers — it's how you grow the funnel, so its CPA runs higher and ROAS lower than warm retargeting. It's the volume engine of the plan.",
  social: "Social (Meta & Instagram) does double duty — prospecting plus DTC conversion — which is why it carries both reach and a solid ROAS. It's the flexible mid-funnel workhorse.",
  retargeting: "Site retargeting converts warm visitors who already know you, so it's the most efficient line in the plan — lowest CPA, highest ROAS — but it's capped by how much qualified traffic the upper funnel sends it.",
};

export type MediaPlanCommand =
  | { kind: "set"; channelId: string; channelLabel: string; amount: number }
  | { kind: "delta"; channelId: string; channelLabel: string; amount: number }
  | { kind: "shift"; fromId: string; fromLabel: string; toId: string; toLabel: string; amount: number }
  | { kind: "toggle"; channelId: string; channelLabel: string; on: boolean }
  | { kind: "total"; amount: number }
  | { kind: "why"; channelKey: MediaChannelKey; channelLabel: string };

/** Interpret a freeform message as an edit to the active plan. Returns null if it isn't one.
 *  `lastChannelKey` lets pronouns ("change it to 14000") resolve to the channel last edited. */
export function parseMediaPlanCommand(
  text: string,
  plan: MediaPlan,
  lastChannelKey?: MediaChannelKey | null
): MediaPlanCommand | null {
  const t = text.toLowerCase().trim();
  const byKey = (k: MediaChannelKey) => plan.campaigns.find((c) => c.channel === k);
  const hasPronoun = /\b(it|that|this)\b/.test(t);
  // Resolve a channel from the text, falling back to the last-edited one for pronouns.
  const chan = (seg: string): MediaChannelKey | null =>
    matchChannelKey(seg) ?? (hasPronoun && lastChannelKey ? lastChannelKey : null);

  // "why CTV?" — explanation, no mutation.
  if (/\bwhy\b/.test(t)) {
    const k = matchChannelKey(t);
    if (k) return { kind: "why", channelKey: k, channelLabel: byKey(k)?.label ?? k };
  }

  // "shift $10k from DOOH to social" / "move 10k from x to y"
  if (/\b(shift|move|reallocate)\b/.test(t) && /\bfrom\b/.test(t) && /\bto\b/.test(t)) {
    const fromPart = t.split(/\bfrom\b/)[1] || "";
    const [fromSeg, toSeg] = fromPart.split(/\bto\b/);
    const fromK = matchChannelKey(fromSeg || "");
    const toK = matchChannelKey(toSeg || "");
    const amt = parseAmount(t);
    if (fromK && toK && amt) {
      const from = byKey(fromK), to = byKey(toK);
      if (from && to) return { kind: "shift", fromId: from.id, fromLabel: from.label, toId: to.id, toLabel: to.label, amount: amt };
    }
  }

  // "turn off DOOH" / "pause social" / "turn on ctv"
  if (/\b(turn off|pause|disable|remove|drop|turn on|enable|add back)\b/.test(t)) {
    const k = matchChannelKey(t);
    if (k) {
      const c = byKey(k);
      const on = /\b(turn on|enable|add back)\b/.test(t);
      if (c) return { kind: "toggle", channelId: c.id, channelLabel: c.label, on };
    }
  }

  // "increase retargeting by 5k" / "cut social by 10k"
  const deltaUp = /\b(increase|raise|bump|add|boost)\b/.test(t);
  const deltaDown = /\b(decrease|cut|reduce|lower|trim)\b/.test(t);
  if ((deltaUp || deltaDown) && /\bby\b/.test(t)) {
    const k = chan(t);
    const amt = parseAmount((t.split(/\bby\b/)[1]) || "");
    if (k && amt) {
      const c = byKey(k);
      if (c) return { kind: "delta", channelId: c.id, channelLabel: c.label, amount: deltaDown ? -amt : amt };
    }
  }

  // "change CTV budget to 11458" / "set social to $30k"
  if (/\b(change|set|make|update|put)\b/.test(t) && /\bto\b/.test(t)) {
    const k = chan(t);
    const amt = parseAmount((t.split(/\bto\b/)[1]) || "");
    if (amt != null) {
      if (k) {
        const c = byKey(k);
        if (c) return { kind: "set", channelId: c.id, channelLabel: c.label, amount: amt };
      }
      // "set the total to 90k" / "change the budget to 90000"
      if (/\btotal\b|\bbudget\b/.test(t)) return { kind: "total", amount: amt };
    }
  }

  return null;
}

function flightLabel(now: Date, durationDays: number): string {
  const end = new Date(now.getTime() + durationDays * 86_400_000);
  const m = (d: Date) => d.toLocaleString("en-US", { month: "short" });
  const startM = m(now);
  const endM = m(end);
  const year = end.getFullYear();
  return startM === endM ? `${startM} ${year}` : `${startM}–${endM} ${year}`;
}

export function buildMediaPlan(
  advertiser: Advertiser,
  objective: string,
  monthlyBudget: number,
  /** The brief's stated goal, when present — drives the honest target vs forecast. */
  goal?: { conversions?: number; roas?: number },
  /** Active agency client id — anchors the plan to that client's real-shaped data. */
  clientId?: string
): MediaPlan {
  const now = new Date();
  const nowIso = now.toISOString();
  const durationDays = 90;

  // When we know the client, anchor the plan to their real-shaped performance:
  // budget defaults to their actual monthly spend, and the per-channel ROAS/CPA
  // vector is scaled so the plan's blended numbers match what they really get.
  const anchor = clientId ? getClientAnchor(clientId) : null;

  // The plan total is the flight budget; scale the $120k template proportionally.
  const total = monthlyBudget > 0 ? monthlyBudget : anchor ? anchor.monthlyBudget : TEMPLATE_TOTAL;
  const factor = total / TEMPLATE_TOTAL;
  // Anchored plans ARE personalized — we have the client's connected-platform
  // history. Only the non-anchored (no-client) path falls back to the pixel check.
  const pixelReady = anchor ? true : getCapabilities().hasSitePixel;

  const campaigns: MediaCampaign[] = CHANNEL_TEMPLATE.map((t) => {
    const baseBudget = Math.round(t.budget * factor);
    const baseForecast = scaleForecast(t.baseForecast, factor);
    return {
      ...t,
      budget: baseBudget,
      baseBudget,
      baseForecast,
      forecast: baseForecast,
    };
  });

  // Anchor to the client's real blended numbers, while preserving the template's
  // relative channel structure. CRITICAL: the headline blended ROAS the card shows
  // is total revenue ÷ TOTAL enabled budget (recalcMediaPlan) — which includes the
  // $0-revenue awareness channels (CTV/DOOH). So we scale per-channel ROAS so that
  // revenue ÷ full budget == anchor.blendedRoas, and conversions so that full budget
  // ÷ conversions == anchor.blendedCpa. This makes the KPI tile, the evidence panel,
  // and getClientAnchor agree (no self-contradiction).
  if (anchor) {
    const enabledTotal = campaigns.filter((c) => c.enabled).reduce((s, c) => s + c.budget, 0);
    const rev = campaigns.filter((c) => c.enabled && c.baseForecast.roas != null);
    const curRevenue = rev.reduce((s, c) => s + (c.baseForecast.roas as number) * c.budget, 0);
    const roasFactor = curRevenue > 0 && anchor.blendedRoas > 0
      ? (anchor.blendedRoas * enabledTotal) / curRevenue
      : 1;
    const curConv = rev.reduce((s, c) => s + c.baseForecast.conversions, 0);
    const desiredConv = anchor.blendedCpa > 0 ? enabledTotal / anchor.blendedCpa : curConv;
    const convFactor = curConv > 0 ? desiredConv / curConv : 1;
    for (const c of campaigns) {
      if (c.baseForecast.roas != null) {
        const roas = Math.round(c.baseForecast.roas * roasFactor * 100) / 100;
        const conversions = Math.round(c.baseForecast.conversions * convFactor);
        c.baseForecast = { ...c.baseForecast, roas, conversions };
        c.forecast = c.baseForecast;
      }
    }
  }

  const vw = VERTICAL_WORD[advertiser.industry];
  const benchmarkBasis = anchor
    ? `${advertiser.companyName} · last 90 days, connected platforms`
    : vw
    ? `${vw} vertical · benchmarks`
    : "vertical benchmarks";
  const title = OBJ_TITLE[objective] ?? "Media Plan";

  const evidence = anchor
    ? {
        label: `Where ${advertiser.companyName} spends today`,
        basis: "Last 90 days · connected platforms",
        blendedRoas: anchor.blendedRoas,
        channels: anchor.channels.slice(0, 5),
      }
    : undefined;

  const plan: MediaPlan = {
    id: `mediaplan-${Date.now()}`,
    name: `${advertiser.companyName} — ${title}`,
    advertiserId: advertiser.id,
    title,
    objective,
    flight: flightLabel(now, durationDays),
    durationDays,
    benchmarkBasis,
    pixelReady,
    campaigns,
    evidence,
    summary: {
      totalBudget: total,
      estConversions: 0,
      estRoas: 0,
      estImpressions: 0,
      // Targets the plan is measured against: the brief's goal when stated, else
      // a default scaled with budget. The card shows forecast-vs-target honestly.
      targets: {
        conversions: goal?.conversions ?? Math.round(4_500 * factor),
        roas: goal?.roas ?? 3.0,
      },
    },
    reviewState: "draft",
    checkInDays: null,
    createdAt: nowIso,
    lastModifiedAt: nowIso,
    lastModifiedBy: "system",
  };

  // Derive the summary from the campaigns — single source of truth.
  return recalcMediaPlan(plan, nowIso);
}
