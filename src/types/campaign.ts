import type { PersonaId } from "./persona";

export type ReadinessState = "ready" | "limited" | "blocked";

// --- IAB Standard Categories ---

export type IABRestrictedCategory =
  | "adult-content"
  | "arms-ammunition"
  | "crime-harmful"
  | "death-injury-military"
  | "online-piracy"
  | "hate-speech"
  | "obscenity-profanity"
  | "drugs-tobacco-alcohol"
  | "spam-harmful"
  | "terrorism"
  | "sensitive-social";

export type IABIndustry =
  | "automotive"
  | "business-finance"
  | "careers"
  | "education"
  | "entertainment"
  | "family-relationships"
  | "food-drink"
  | "healthy-living"
  | "hobbies-interests"
  | "home-garden"
  | "law-government"
  | "personal-finance"
  | "pets"
  | "science"
  | "sports"
  | "style-fashion"
  | "technology-computing"
  | "travel"
  | "news-current-events"
  | "other";

// --- Advertiser ---

export interface Advertiser {
  id: string;
  companyName: string;
  websiteUrl: string;
  industry: IABIndustry;
  restrictedCategories: IABRestrictedCategory[];
}

// --- Keywords ---

export interface KeywordChip {
  id: string;
  label: string;
  category: "brand" | "product" | "competitor" | "interest";
  selected: boolean;
}

// --- Placements ---

export type PlacementType =
  | "display"
  | "video"
  | "ctv-ott"
  | "native"
  | "audio"
  | "dooh"
  | "in-app"
  | "rich-media";

// --- Strategy Plan (expanded campaign plan) ---

export interface ForecastEstimate {
  weeklyReach: number;
  dailyReach: number;
  weeklyImpressions: number;
  dailyImpressions: number;
  estimatedHouseholds: number;
  confidenceLevel: "low" | "medium" | "high";
  /** Additional metrics from Figma ABMCampaign reference */
  potentialAudienceSize?: number;
  estimatedCPM?: number;
  estimatedFrequency?: number;
}

export interface BudgetScheduleData {
  dailyBudget: number | null;
  monthlyBudget: number | null;
  startDate: string | null;
  endDate: string | null;
  alwaysOn: boolean;
}

export type AudienceTargetingMode = "accounts" | "contacts" | "lookalike";

export interface AudienceData {
  locations: string[];
  marketInterests: string[];
  customAudiences: string[];
  ageRange: { min: number; max: number };
  gender: "all" | "male" | "female";
  demographics: string[];
  /** Targeting mode tabs from Figma reference */
  targetingMode?: AudienceTargetingMode;
  /** Exclude segments */
  excludeSegments?: string[];
  /** Contextual keywords */
  contextualKeywords?: string[];
}

export type OptimizationTarget = "conversions" | "clicks" | "impressions" | "reach" | "video-views";

export interface BiddingData {
  strategy: "automatic" | "manual";
  manualCpm: number | null;
  optimizationTarget?: OptimizationTarget;
}

export interface CreativeAsset {
  id: string;
  name: string;
  type: "image" | "video" | "html5";
}

export interface CreativeData {
  status: "not-started" | "uploaded" | "ai-generated" | "deferred";
  assets: CreativeAsset[];
}

// --- Provenance + Authorship ---

export type ProvenanceSource = "user_input" | "ai_inferred" | "brief_extracted" | "default" | "previous_campaign";

export interface SectionProvenance {
  source: ProvenanceSource;
  reasoning: string;
  confidence?: "high" | "medium" | "low";
}

export type AuthorshipState = "proposed" | "decided" | "edited" | "locked";

export interface SectionEdit {
  previousValue: string;
  editedAt: string;
  editedBy: string;
}

/**
 * AI interaction modes — Notion-style, adapted to the marketer mental model.
 * - express: build the artifact fast with smart defaults (was "assisted")
 * - plan: walk through targeting/budget/creative step by step (was "conversational")
 * - advise: recommend with evidence, no auto-build
 * - research: pull data and surface performance insights
 */
export type ChatMode = "express" | "plan" | "advise" | "research";

export type DetailLevel = "normal" | "thinking" | "verbose" | "summary";

export type StrategyPlanStatus = "draft" | "pending-approval" | "approved" | "active" | "paused" | "archived";

export interface StrategySection {
  label: string;
  value: string;
  provenance: SectionProvenance;
  readiness: ReadinessState;
  editable: boolean;
  authorshipState: AuthorshipState;
  filled: boolean;
  editHistory: SectionEdit[];
  /**
   * Set when this section is blocked on a missing prerequisite the user must
   * connect (e.g. a site pixel for retargeting). Drives the inline "Connect"
   * resolution action on the StrategyCard.
   */
  prerequisite?: { requires: string; connectLabel: string };
}

export interface StrategyPlan {
  id: string;
  name: string;
  status: StrategyPlanStatus;
  advertiserId: string;
  objective: StrategySection;
  budgetSchedule: StrategySection & { data: BudgetScheduleData };
  audience: StrategySection & { data: AudienceData };
  placements: StrategySection & { data: PlacementType[] };
  bidding: StrategySection & { data: BiddingData };
  creative: StrategySection & { data: CreativeData };
  forecast: StrategySection & { data: ForecastEstimate };
  keywords: KeywordChip[];
  createdAt: string;
  lastModifiedAt: string;
  lastModifiedBy: string;
}

export interface PlanSection {
  label: string;
  value: string;
  rationale: string;
  readiness: ReadinessState;
  editable: boolean;
}

export interface CampaignPlan {
  id: string;
  name: string;
  status: "draft" | "pending-approval" | "approved" | "activated";
  sections: {
    objective: PlanSection;
    audience: PlanSection;
    budget: PlanSection;
    channels: PlanSection;
    schedule: PlanSection;
    destination: PlanSection;
    creative: PlanSection;
    conversion: PlanSection;
    tracking: PlanSection;
  };
}

export type CampaignPlanSectionKey = keyof CampaignPlan["sections"];

export interface Approver {
  id: string;
  name: string;
  role: string;
}

export interface ApprovalComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: string;
}

// --- CFO Narrative ---

export type CFONarrativeStatus = "draft" | "final" | "archived";

export type CFONarrativeSectionKey =
  | "spendByChannel"
  | "attributionByChannel"
  | "whatChanged"
  | "recommendedNextMoves"
  | "confidenceSummary";

export interface CFONarrative {
  id: string;
  name: string;
  status: CFONarrativeStatus;
  advertiserId: string;
  period: { month: number; year: number };
  spendByChannel: StrategySection;
  attributionByChannel: StrategySection;
  whatChanged: StrategySection;
  recommendedNextMoves: StrategySection;
  confidenceSummary: StrategySection;
  createdAt: string;
  lastModifiedAt: string;
  lastModifiedBy: string;
}

// --- Competitive Intelligence ---

export interface CompetitorRow {
  name: string;
  /** Estimated traffic / share of voice, e.g. "18%". */
  trafficShare: string;
  /** Trend vs prior period, e.g. "+3 pts". */
  trend: string;
  /** Primary acquisition channel, e.g. "Paid social". */
  primaryChannel: string;
}

export interface CompetitiveBrief {
  id: string;
  name: string;
  advertiserId: string;
  generatedAt: string;
  marketPosition: StrategySection;
  topCompetitors: StrategySection & { data: CompetitorRow[] };
  messagingAngles: StrategySection;
  whereToWin: StrategySection;
  createdAt: string;
  lastModifiedAt: string;
  lastModifiedBy: string;
}

// --- Agency (portfolio of client brands) ---

export type AgencyClientStatus = "active" | "onboarding" | "paused";
export type AgencyRole = "strategist" | "account-lead" | "client";

export interface AgencyClient {
  id: string;
  name: string;
  domain: string;
  industry: string;
  status: AgencyClientStatus;
  monthlyBudget: number;
  /** Account lead's display name. */
  lead: string;
  /** Active campaign count (display). */
  campaigns: number;
}

export interface AgencyTeamMember {
  id: string;
  name: string;
  initials: string;
  role: AgencyRole;
}

// --- Media Plan (funnel-grouped, inline-editable, single-source forecast) ---
// Per the AdRoll Media Planner spec: channels grouped Awareness→Consideration→
// Conversion, each an editable budget row with a per-channel forecast. ONE
// source of truth — summary.estConversions === Σ campaign.forecast.conversions,
// blended ROAS is a real ratio (revenue/spend), never "scales with spend."

export type FunnelStage = "awareness" | "consideration" | "conversion";
export type MediaChannelKey = "ctv" | "dooh" | "lookalike" | "social" | "retargeting";
export type MediaChannelStatus = "available" | "closed_beta";

export interface MediaForecast {
  impressions: number;
  conversions: number; // 0 for awareness channels — they're brand plays
  roas: number | null; // null for awareness
  cpa: number | null; // null for awareness
  // Specialty metrics — present only on the channels that report them:
  vtr?: number; // CTV view-through-rate %
  brandLift?: number; // CTV brand-lift %
  cpm?: number; // CTV / DOOH CPM ($)
  markets?: number; // DOOH market count
  audiencePool?: number; // DOOH geo-fenced pool size
}

export interface MediaCampaign {
  id: string;
  channel: MediaChannelKey;
  label: string;
  description: string;
  funnelStage: FunnelStage;
  status: MediaChannelStatus;
  budget: number; // editable inline
  enabled: boolean; // on/off toggle
  baseBudget: number; // reference point for linear recalc
  baseForecast: MediaForecast; // forecast at baseBudget
  forecast: MediaForecast; // recalculated from current budget
  /** Optional line-item targeting — a single channel can run many lines, each
   *  for a different market/city with its own creative (e.g. CTV New York vs
   *  CTV Los Angeles). Empty on the default one-line-per-channel plan. */
  location?: string;
  creative?: string;
  audience?: string;
  keywords?: string;
  /** Flighting window for this line, e.g. "Jun 1 – Jun 30" (scheduling). */
  flightDates?: string;
}

export interface MediaPlanSummary {
  totalBudget: number;
  estConversions: number;
  estRoas: number;
  estImpressions: number;
  targets: { conversions: number; roas: number };
}

export type MediaPlanReviewState = "draft" | "pending-approval" | "approved" | "active" | "paused" | "archived";

/** Real-shaped client performance the plan was anchored to (evidence-before-persuasion). */
export interface MediaPlanEvidence {
  label: string; // e.g. "Where Vans spends today"
  basis: string; // e.g. "Last 90 days · connected platforms"
  blendedRoas: number;
  /** Top platform channels (Google, Social, Display, LinkedIn…) by spend share. */
  channels: { channel: string; spendShare: number; roas: number }[];
}

export interface MediaPlan {
  id: string;
  name: string;
  advertiserId: string;
  title: string; // e.g. "SPF Launch"
  objective: string;
  flight: string; // e.g. "May–Jul 2026"
  durationDays: number;
  benchmarkBasis: string; // e.g. "beauty vertical · benchmarks"
  pixelReady: boolean; // false ⇒ vertical-benchmark fallback callout
  campaigns: MediaCampaign[]; // funnel-ordered
  summary: MediaPlanSummary;
  reviewState: MediaPlanReviewState;
  checkInDays: 30 | 45 | 60 | null; // set at activation
  /** Present when anchored to a client's real-shaped performance (the demo's "feels real"). */
  evidence?: MediaPlanEvidence;
  /** The chat session that built this plan — reopening the plan restores that
   *  conversation so the user can read the history and keep asking. */
  chatSessionId?: string;
  /** Field ids the AI just changed (campaign id, or "total") — highlighted in
   *  the card until the user clicks into the field. Cleared on manual edits. */
  aiTouched?: string[];
  createdAt: string;
  lastModifiedAt: string;
  lastModifiedBy: string;
  /** Client collaboration. Comments are pinned to an element label (anchor) or
   *  plan-level. Optional ⇒ plans persisted before this field hydrate fine. */
  comments?: MediaPlanComment[];
  sharedWithClient?: boolean;
  sharedClientId?: PersonaId;
  /** Client sign-off — separate from the internal agency review gate. */
  clientApproval?: {
    state: "approved" | "changes-requested";
    byName: string;
    at: string; // ISO
    note?: string;
  };
}

/** A comment on a media plan — a Figma/Miro-style pin dropped anywhere on the
 *  canvas. Shared between the agency and the client view. */
export interface MediaPlanComment {
  id: string;
  authorId: PersonaId;
  authorName: string;
  authorRole: "agency" | "client";
  content: string;
  timestamp: string; // new Date().toLocaleString(), matches ApprovalComment
  /** Drop location as a % of the canvas content box (so it tracks on scroll/resize). */
  pin?: { xPct: number; yPct: number };
  resolved?: boolean;
  /** Top-level when undefined; otherwise a reply to this comment id. */
  parentId?: string;
}

// --- Operator (delegated agentic execution) ---

export type OperatorScope =
  | "bids"
  | "budget-shifts"
  | "creative-rotation"
  | "audience-expansion";
export type OperatorFrequency = "daily" | "weekly";
export type OperatorMode = "operator" | "manual";
export type OperatorStatus = "proposed" | "active";

export interface OperatorGuardrails {
  /** Monthly spend ceiling the operator may never exceed. */
  budgetCap: number;
  /** How often the operator may make optimization moves. */
  frequency: OperatorFrequency;
  /** Which levers the operator is allowed to adjust. */
  scope: OperatorScope[];
}

export interface OperatorPlan {
  id: string;
  strategyId: string;
  strategyName: string;
  /** null until the user picks a path. */
  mode: OperatorMode | null;
  guardrails: OperatorGuardrails;
  status: OperatorStatus;
  createdAt: string;
}

// --- Audience Segments ---

export type AudienceSegmentType = "retargeting" | "lookalike" | "customer-list" | "interest";
export type AudienceSegmentStatus = "draft" | "ready" | "active" | "paused" | "archived";

export interface AudienceRule {
  label: string;
  value: string;
  provenance: SectionProvenance;
}

export interface AudienceSegment {
  id: string;
  name: string;
  type: AudienceSegmentType;
  status: AudienceSegmentStatus;
  advertiserId: string;
  estimatedSize: string;
  rules: AudienceRule[];
  platforms: string[];
  createdAt: string;
  lastModifiedAt: string;
}

// --- Approvals ---

export interface ApprovalRequest {
  id: string;
  strategy: StrategyPlan;
  sentBy: string;
  sentByName: string;
  sentTo: string;
  sentToName: string;
  sentAt: string;
  comments: ApprovalComment[];
  resolution?: "approved" | "changes-requested" | "rejected";
  resolvedAt?: string;
}
