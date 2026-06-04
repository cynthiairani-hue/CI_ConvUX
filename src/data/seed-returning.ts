import type {
  StrategyPlan,
  AudienceSegment,
  CFONarrative,
  ApprovalRequest,
  Advertiser,
  MediaPlan,
} from "@/types/campaign";
import type { PersonaId } from "@/types/persona";
import { buildStrategyFromIntent } from "./campaign-flow";
import { buildMediaPlan } from "./media-plan-flow";
import { buildCompetitiveBrief } from "./competitive-flow";
import { mapBrandIndustryToIAB, getCurrentBrand } from "./brand-profiles";
import { buildNarrativeFromSeed } from "./narrative-flow";
import { FFERN_SEED_PERFORMANCE, FFERN_SEED_ANOMALIES } from "./seed-ffern";
import { SEED_PERFORMANCE, SEED_ANOMALIES } from "./seed-company";
import { SEED_CHAT_SESSIONS } from "./seed-chats";
import type { StoredChatSession } from "@/lib/storage";

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

function buildSeedMediaPlans(adv: Advertiser): MediaPlan[] {
  const n = adv.companyName;
  const mk = (
    objective: string,
    budget: number,
    goal: { conversions?: number; roas?: number },
    overrides: Partial<MediaPlan>
  ): MediaPlan => ({ ...buildMediaPlan(adv, objective, budget, goal), ...overrides });
  // Staggered flights across the year so the Campaign Timeline reads like a
  // real calendar (not all bars stacked in one span), with a spread of statuses.
  return [
    mk("awareness", 120_000, { conversions: 5_000, roas: 3 }, {
      id: "seed-mp-launch", name: `${n} — Spring Launch`, reviewState: "active",
      flight: "Apr–Jun 2026", durationDays: 90,
      createdAt: daysAgo(20), lastModifiedAt: daysAgo(3), lastModifiedBy: "Cynthia Irani",
      chatSessionId: "seed-chat-launch", // reopen restores this conversation
    }),
    mk("sales", 80_000, { conversions: 3_500, roas: 3.5 }, {
      id: "seed-mp-aon", name: `${n} — Always-On Retargeting`, reviewState: "active",
      flight: "Jan–Dec 2026", durationDays: 365,
      createdAt: daysAgo(6), lastModifiedAt: daysAgo(1), lastModifiedBy: "Cynthia Irani",
      chatSessionId: "seed-chat-aon",
    }),
    mk("awareness", 45_000, { conversions: 1_800, roas: 3 }, {
      id: "seed-mp-q3", name: `${n} — Q3 Prospecting`, reviewState: "draft",
      flight: "Jul–Sep 2026", durationDays: 90,
      createdAt: daysAgo(2), lastModifiedAt: daysAgo(2), lastModifiedBy: "Cynthia Irani",
      chatSessionId: "seed-chat-q3",
    }),
    mk("sales", 65_000, { conversions: 2_600, roas: 4 }, {
      id: "seed-mp-holiday", name: `${n} — Holiday Push`, reviewState: "approved",
      flight: "Sep–Dec 2026", durationDays: 90,
      createdAt: daysAgo(4), lastModifiedAt: daysAgo(1), lastModifiedBy: "Cynthia Irani",
    }),
  ];
}

/**
 * Agency chat history — real, coherent media-plan conversations for the active
 * client, each LINKED to a seeded media plan (clicking the chat opens the plan).
 * No impossible actions (no city/week geo-flighting) — only what the app does.
 */
function buildAgencyChatSessions(n: string): StoredChatSession[] {
  return [
    {
      id: "seed-chat-launch", name: `${n} — Spring Launch plan`, status: "active",
      group: "campaigns", createdAt: daysAgo(20), lastMessageAt: daysAgo(3), messageCount: 3,
      messages: [
        { role: "user", content: `Build a media plan for ${n}'s spring launch — $120K, brand awareness, 90-day flight.` },
        { role: "assistant", content: `Built it — 5 channels across $120K, anchored to ${n}'s last-90-days performance. Awareness-led (CTV + DOOH) with lookalike prospecting and retargeting underneath. Forecasting ~5,000 conversions at a 3× blended ROAS.` },
        { role: "user", content: "Shift $10k from DOOH to social." },
        { role: "assistant", content: "Done — moved $10K from DOOH to Social. Recalculated the forecast and the plan's live now." },
      ],
    },
    {
      id: "seed-chat-aon", name: `${n} — Always-On Retargeting`, status: "active",
      group: "campaigns", createdAt: daysAgo(6), lastMessageAt: daysAgo(1), messageCount: 2,
      messages: [
        { role: "user", content: `Set up an always-on retargeting plan for ${n} — $80K, conversions-first, 3.5× ROAS target.` },
        { role: "assistant", content: `Done — retargeting-weighted plan across $80K, anchored to ${n}'s channel ROAS. Sent to Marcus Patel for approval before launch.` },
      ],
    },
    {
      id: "seed-chat-perf", name: `${n} — May performance`, status: "active",
      group: "performance", createdAt: daysAgo(2), lastMessageAt: daysAgo(2), messageCount: 2,
      messages: [
        { role: "user", content: `How is ${n} performing this month?` },
        { role: "assistant", content: `${n} is up — Google is the efficiency leader at 7.6× ROAS, Social at 6.3×, Display at 5.2×. Blended ROAS 6.8× over the last 90 days. Paid Social CPA is creeping up; two lookalikes are dragging it.` },
      ],
    },
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
  // Sent BY the acting persona (whichever Cynthia is signed in) → Marcus, the
  // account-lead/approver. This makes it show under "Sent by me · awaiting
  // Marcus" in every scenario, so the portfolio attention signal that links here
  // actually resolves to a visible request.
  const me = (localStorage.getItem("fuseiq-persona") || "cynthia-b2c") as PersonaId;
  return [
    {
      id: "seed-approval-retargeting",
      strategy: retarget,
      sentBy: me,
      sentByName: "Cynthia Irani",
      sentTo: "marcus-patel",
      sentToName: "Marcus Patel",
      sentAt: ts,
      comments: [
        {
          id: "seed-comment-1",
          authorId: me,
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
  "fuseiq-media-plans",
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
  // Agency portfolio (no client selected) works per-client (see ensureAgencySeed)
  // — don't seed a single-brand workspace there. But once a client is entered,
  // getCurrentBrand() resolves to that client, so seeding fills *their* scoped
  // workspace (campaigns, audiences, reports) — which is exactly what we want.
  if (
    localStorage.getItem("fuseiq-persona") === "cynthia-agency" &&
    !localStorage.getItem("fuseiq-active-client")
  ) {
    return;
  }

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
  // Agency clients get coherent, client-scoped chats linked to their plans;
  // the in-house brand keeps the Ffern seed. (No cross-client leakage.)
  const isAgencyClient =
    localStorage.getItem("fuseiq-persona") === "cynthia-agency" &&
    !!localStorage.getItem("fuseiq-active-client");
  if (isEmptyKey("fuseiq-chat-sessions")) {
    set("fuseiq-chat-sessions", isAgencyClient ? buildAgencyChatSessions(adv.companyName) : SEED_CHAT_SESSIONS);
  }
  // Media plans — the agency's unit of work. Seeded so the Media Plans page has
  // real plans that open the media-plan card (not campaigns). Version-gated: a
  // bump re-seeds the curated set once (e.g. to refresh staggered flights),
  // overwriting prior demo plans, then respects the user's edits going forward.
  const MP_SEED_VERSION = "v3-two-active";
  if (localStorage.getItem("fuseiq-media-plans-seed") !== MP_SEED_VERSION) {
    set("fuseiq-media-plans", buildSeedMediaPlans(adv));
    localStorage.setItem("fuseiq-media-plans-seed", MP_SEED_VERSION);
  } else if (isEmptyKey("fuseiq-media-plans")) {
    set("fuseiq-media-plans", buildSeedMediaPlans(adv));
  }
}
