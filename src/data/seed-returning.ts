import type {
  StrategyPlan,
  AudienceSegment,
  CFONarrative,
  ApprovalRequest,
  Advertiser,
} from "@/types/campaign";
import { buildStrategyFromIntent } from "./campaign-flow";
import { buildCompetitiveBrief } from "./competitive-flow";
import { mapBrandIndustryToIAB, getCurrentBrand } from "./brand-profiles";
import { buildNarrativeFromSeed } from "./narrative-flow";
import { FFERN_SEED_PERFORMANCE, FFERN_SEED_ANOMALIES } from "./seed-ffern";
import { SEED_PERFORMANCE, SEED_ANOMALIES } from "./seed-company";
import { SEED_CHAT_SESSIONS } from "./seed-chats";

/**
 * Returning-user demo seed.
 *
 * The "Returning user" demo mode should land the user in a fully-populated
 * workspace: campaign strategies (varied statuses), audiences, custom reports
 * (narratives), a pending approval, and past chat sessions. Performance data is
 * already static seed; this fills the localStorage-backed artifacts that were
 * otherwise empty until manually created.
 *
 * ensureReturningSeed() is idempotent: it only writes keys that are currently
 * empty, and never runs in "first-time" demo mode.
 */

/** Advertiser for the seed — derived from the signed-in brand (Ffern, Norwest, …). */
function getSeedAdvertiser(): Advertiser {
  const brand = getCurrentBrand();
  if (brand) {
    return {
      id: `adv-${brand.domain.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      companyName: brand.name,
      websiteUrl: brand.domain,
      industry: mapBrandIndustryToIAB(brand.industry),
      restrictedCategories: [],
    };
  }
  return {
    id: "adv-ffern-co",
    companyName: "Ffern",
    websiteUrl: "ffern.co",
    industry: mapBrandIndustryToIAB("Luxury Fragrance"),
    restrictedCategories: [],
  };
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function buildSeedStrategies(adv: Advertiser): StrategyPlan[] {
  const n = adv.companyName;
  const mk = (objective: string, overrides: Partial<StrategyPlan>): StrategyPlan => ({
    ...buildStrategyFromIntent({ objective }, adv),
    ...overrides,
  });
  return [
    mk("awareness", {
      id: "seed-strat-awareness",
      name: `${n} — Summer 25 CTV Launch`,
      status: "active",
      createdAt: daysAgo(21),
      lastModifiedAt: daysAgo(3),
      lastModifiedBy: "Cynthia Irani",
    }),
    mk("retargeting", {
      id: "seed-strat-retargeting",
      name: `${n} — Site Retargeting`,
      status: "pending-approval",
      createdAt: daysAgo(5),
      lastModifiedAt: daysAgo(1),
      lastModifiedBy: "Cynthia Irani",
    }),
    mk("traffic", {
      id: "seed-strat-traffic",
      name: `${n} — Demand Capture`,
      status: "draft",
      createdAt: daysAgo(2),
      lastModifiedAt: daysAgo(2),
      lastModifiedBy: "Cynthia Irani",
    }),
    mk("sales", {
      id: "seed-strat-sales",
      name: `${n} — Conversion Push`,
      status: "paused",
      createdAt: daysAgo(40),
      lastModifiedAt: daysAgo(12),
      lastModifiedBy: "Cynthia Irani",
    }),
  ];
}

function buildSeedAudiences(adv: Advertiser): AudienceSegment[] {
  const n = adv.companyName;
  return [
    {
      id: "seed-aud-retargeting",
      name: `${n} — Site Visitors (Last 30 Days)`,
      type: "retargeting",
      status: "active",
      advertiserId: adv.id,
      estimatedSize: "18,400 - 22,100",
      rules: [
        { label: "Source", value: "Website visitors", provenance: { source: "user_input", reasoning: "Visitors to ffern.co in the last 30 days" } },
        { label: "Lookback window", value: "Last 30 days", provenance: { source: "ai_inferred", reasoning: "Standard retargeting window for considered purchases" } },
        { label: "Exclude", value: "Purchased in last 90 days", provenance: { source: "ai_inferred", reasoning: "Avoid spending on recent converters" } },
      ],
      platforms: ["Meta", "Google", "The Trade Desk"],
      createdAt: daysAgo(30),
      lastModifiedAt: daysAgo(4),
    },
    {
      id: "seed-aud-lookalike",
      name: `${n} — Lookalike (Top LTV Customers)`,
      type: "lookalike",
      status: "ready",
      advertiserId: adv.id,
      estimatedSize: "340,000 - 520,000",
      rules: [
        { label: "Seed audience", value: "Top 20% customers by LTV", provenance: { source: "ai_inferred", reasoning: "Highest-value customers as the model seed" } },
        { label: "Similarity", value: "1-3% expansion", provenance: { source: "ai_inferred", reasoning: "Tight expansion preserves quality" } },
      ],
      platforms: ["Meta", "Google"],
      createdAt: daysAgo(18),
      lastModifiedAt: daysAgo(6),
    },
    {
      id: "seed-aud-interest",
      name: `${n} — High-Intent Interest`,
      type: "interest",
      status: "active",
      advertiserId: adv.id,
      estimatedSize: "1.2M - 2.4M",
      rules: [
        { label: "Interests", value: "Category-relevant interests & behaviors", provenance: { source: "ai_inferred", reasoning: `Aligned with ${n}'s positioning` } },
        { label: "Demographics", value: "Core buyer profile", provenance: { source: "ai_inferred", reasoning: `${n}'s highest-converting demographic` } },
      ],
      platforms: ["Meta", "TikTok"],
      createdAt: daysAgo(10),
      lastModifiedAt: daysAgo(10),
    },
  ];
}

function buildSeedNarratives(adv: Advertiser): CFONarrative[] {
  const isFfern = adv.websiteUrl === "ffern.co";
  const perf = isFfern ? FFERN_SEED_PERFORMANCE : SEED_PERFORMANCE;
  const anomalies = isFfern ? FFERN_SEED_ANOMALIES : SEED_ANOMALIES;
  const n = adv.companyName;
  const may = buildNarrativeFromSeed(perf, anomalies, { month: 5, year: 2026 });
  const apr = buildNarrativeFromSeed(perf, anomalies, { month: 4, year: 2026 });
  return [
    { ...may, id: "seed-narr-may", name: `${n} — May 2026 Performance`, status: "final", advertiserId: adv.id, createdAt: daysAgo(8), lastModifiedAt: daysAgo(8), lastModifiedBy: "Cynthia Irani" },
    { ...apr, id: "seed-narr-apr", name: `${n} — April 2026 Performance`, status: "final", advertiserId: adv.id, createdAt: daysAgo(38), lastModifiedAt: daysAgo(36), lastModifiedBy: "Cynthia Irani" },
  ];
}

function buildSeedApprovals(strategies: StrategyPlan[]): ApprovalRequest[] {
  const retarget = strategies.find((s) => s.id === "seed-strat-retargeting");
  if (!retarget) return [];
  const ts = new Date(Date.now() - 86_400_000).toLocaleString();
  return [
    {
      id: "seed-approval-retargeting",
      strategy: retarget,
      sentBy: "cynthia-b2c",
      sentByName: "Cynthia Irani",
      sentTo: "marcus-patel",
      sentToName: "Marcus Patel",
      sentAt: ts,
      comments: [
        {
          id: "seed-comment-1",
          authorId: "cynthia-b2c",
          authorName: "Cynthia Irani",
          content: "Starting at $2K/mo — flag if you want it higher before we launch. Audience is gated on the site pixel install.",
          timestamp: ts,
        },
      ],
    },
  ];
}

/** localStorage keys the returning-user seed populates. */
export const SEEDED_KEYS = [
  "fuseiq-strategies",
  "fuseiq-advertisers",
  "fuseiq-audiences",
  "fuseiq-narratives",
  "fuseiq-approvals",
  "fuseiq-briefs",
  "fuseiq-chat-sessions",
] as const;

function isEmptyKey(key: string): boolean {
  try {
    const v = localStorage.getItem(key);
    return !v || (JSON.parse(v) as unknown[]).length === 0;
  } catch {
    return true;
  }
}

/**
 * Seed the returning-user workspace into localStorage. Idempotent — only fills
 * empty keys, and never runs in "first-time" demo mode. Safe to call from
 * multiple providers; the first caller seeds and the rest no-op.
 */
export function ensureReturningSeed(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("fuseiq-demo-user-state") === "first-time") return;
  // Agency works per-client (see ensureAgencySeed) — don't seed a single-brand
  // workspace for it, or it'd inherit the fallback brand's campaigns.
  if (localStorage.getItem("fuseiq-persona") === "cynthia-agency") return;

  const set = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
  const adv = getSeedAdvertiser();

  let strategies: StrategyPlan[] | null = null;
  if (isEmptyKey("fuseiq-strategies")) {
    strategies = buildSeedStrategies(adv);
    set("fuseiq-strategies", strategies);
  }
  // Ensure the canonical advertiser is present (merge, not skip-if-empty) so
  // seeded strategies' advertiserId always resolves to the brand name in the UI,
  // even if the app also auto-infers a separate advertiser at runtime.
  try {
    const advs = JSON.parse(localStorage.getItem("fuseiq-advertisers") || "[]") as Advertiser[];
    if (!advs.some((a) => a.id === adv.id)) {
      set("fuseiq-advertisers", [adv, ...advs]);
    }
  } catch {
    set("fuseiq-advertisers", [adv]);
  }
  if (isEmptyKey("fuseiq-audiences")) set("fuseiq-audiences", buildSeedAudiences(adv));
  if (isEmptyKey("fuseiq-narratives")) set("fuseiq-narratives", buildSeedNarratives(adv));
  if (isEmptyKey("fuseiq-approvals")) {
    const strats =
      strategies ||
      (JSON.parse(localStorage.getItem("fuseiq-strategies") || "[]") as StrategyPlan[]);
    set("fuseiq-approvals", buildSeedApprovals(strats));
  }
  if (isEmptyKey("fuseiq-briefs")) set("fuseiq-briefs", [buildCompetitiveBrief(adv)]);
  if (isEmptyKey("fuseiq-chat-sessions")) set("fuseiq-chat-sessions", SEED_CHAT_SESSIONS);
}
