import type {
  StrategyPlan,
  AudienceSegment,
  CFONarrative,
  ApprovalRequest,
  Advertiser,
} from "@/types/campaign";
import { buildStrategyFromIntent } from "./campaign-flow";
import { buildCompetitiveBrief } from "./competitive-flow";
import { mapBrandIndustryToIAB } from "./brand-profiles";
import { buildNarrativeFromSeed } from "./narrative-flow";
import { FFERN_SEED_PERFORMANCE, FFERN_SEED_ANOMALIES } from "./seed-ffern";
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

const ADVERTISER: Advertiser = {
  id: "adv-ffern",
  companyName: "Ffern",
  websiteUrl: "ffern.co",
  industry: mapBrandIndustryToIAB("Luxury Fragrance"),
  restrictedCategories: [],
};

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function buildSeedStrategies(): StrategyPlan[] {
  const mk = (objective: string, overrides: Partial<StrategyPlan>): StrategyPlan => ({
    ...buildStrategyFromIntent({ objective }, ADVERTISER),
    ...overrides,
  });
  return [
    mk("awareness", {
      id: "seed-strat-awareness",
      name: "Ffern — Summer 25 CTV Launch",
      status: "active",
      createdAt: daysAgo(21),
      lastModifiedAt: daysAgo(3),
      lastModifiedBy: "Cynthia Irani",
    }),
    mk("retargeting", {
      id: "seed-strat-retargeting",
      name: "Ffern — Site Retargeting",
      status: "pending-approval",
      createdAt: daysAgo(5),
      lastModifiedAt: daysAgo(1),
      lastModifiedBy: "Cynthia Irani",
    }),
    mk("traffic", {
      id: "seed-strat-traffic",
      name: "Ffern — Waitlist Traffic",
      status: "draft",
      createdAt: daysAgo(2),
      lastModifiedAt: daysAgo(2),
      lastModifiedBy: "Cynthia Irani",
    }),
    mk("sales", {
      id: "seed-strat-sales",
      name: "Ffern — Spring Conversion",
      status: "paused",
      createdAt: daysAgo(40),
      lastModifiedAt: daysAgo(12),
      lastModifiedBy: "Cynthia Irani",
    }),
  ];
}

function buildSeedAudiences(): AudienceSegment[] {
  return [
    {
      id: "seed-aud-retargeting",
      name: "Ffern — Site Visitors (Last 30 Days)",
      type: "retargeting",
      status: "active",
      advertiserId: ADVERTISER.id,
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
      name: "Ffern — Lookalike (Top LTV Customers)",
      type: "lookalike",
      status: "ready",
      advertiserId: ADVERTISER.id,
      estimatedSize: "340,000 - 520,000",
      rules: [
        { label: "Seed audience", value: "Top 20% customers by LTV", provenance: { source: "ai_inferred", reasoning: "Highest-value subscribers as the model seed" } },
        { label: "Similarity", value: "1-3% expansion", provenance: { source: "ai_inferred", reasoning: "Tight expansion preserves quality" } },
      ],
      platforms: ["Meta", "Google"],
      createdAt: daysAgo(18),
      lastModifiedAt: daysAgo(6),
    },
    {
      id: "seed-aud-interest",
      name: "Ffern — Clean Beauty & Niche Fragrance",
      type: "interest",
      status: "active",
      advertiserId: ADVERTISER.id,
      estimatedSize: "1.2M - 2.4M",
      rules: [
        { label: "Interests", value: "Clean beauty, niche perfumery, artisan goods", provenance: { source: "ai_inferred", reasoning: "Aligned with Ffern's positioning" } },
        { label: "Demographics", value: "25-54, high household income", provenance: { source: "ai_inferred", reasoning: "Luxury fragrance buyer profile" } },
      ],
      platforms: ["Meta", "TikTok"],
      createdAt: daysAgo(10),
      lastModifiedAt: daysAgo(10),
    },
  ];
}

function buildSeedNarratives(): CFONarrative[] {
  const may = buildNarrativeFromSeed(FFERN_SEED_PERFORMANCE, FFERN_SEED_ANOMALIES, { month: 5, year: 2026 });
  const apr = buildNarrativeFromSeed(FFERN_SEED_PERFORMANCE, FFERN_SEED_ANOMALIES, { month: 4, year: 2026 });
  return [
    { ...may, id: "seed-narr-may", name: "Ffern — May 2026 Performance", status: "final", advertiserId: ADVERTISER.id, createdAt: daysAgo(8), lastModifiedAt: daysAgo(8), lastModifiedBy: "Cynthia Irani" },
    { ...apr, id: "seed-narr-apr", name: "Ffern — April 2026 Performance", status: "final", advertiserId: ADVERTISER.id, createdAt: daysAgo(38), lastModifiedAt: daysAgo(36), lastModifiedBy: "Cynthia Irani" },
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

  const set = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

  let strategies: StrategyPlan[] | null = null;
  if (isEmptyKey("fuseiq-strategies")) {
    strategies = buildSeedStrategies();
    set("fuseiq-strategies", strategies);
  }
  // Ensure the canonical Ffern advertiser is present (merge, not skip-if-empty)
  // so seeded strategies' advertiserId always resolves to "Ffern" in the UI,
  // even if the app also auto-infers a separate advertiser at runtime.
  try {
    const advs = JSON.parse(localStorage.getItem("fuseiq-advertisers") || "[]") as Advertiser[];
    if (!advs.some((a) => a.id === ADVERTISER.id)) {
      set("fuseiq-advertisers", [ADVERTISER, ...advs]);
    }
  } catch {
    set("fuseiq-advertisers", [ADVERTISER]);
  }
  if (isEmptyKey("fuseiq-audiences")) set("fuseiq-audiences", buildSeedAudiences());
  if (isEmptyKey("fuseiq-narratives")) set("fuseiq-narratives", buildSeedNarratives());
  if (isEmptyKey("fuseiq-approvals")) {
    const strats =
      strategies ||
      (JSON.parse(localStorage.getItem("fuseiq-strategies") || "[]") as StrategyPlan[]);
    set("fuseiq-approvals", buildSeedApprovals(strats));
  }
  if (isEmptyKey("fuseiq-briefs")) set("fuseiq-briefs", [buildCompetitiveBrief(ADVERTISER)]);
  if (isEmptyKey("fuseiq-chat-sessions")) set("fuseiq-chat-sessions", SEED_CHAT_SESSIONS);
}
