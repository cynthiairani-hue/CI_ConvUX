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
}

export interface BudgetScheduleData {
  dailyBudget: number | null;
  monthlyBudget: number | null;
  startDate: string | null;
  endDate: string | null;
  alwaysOn: boolean;
}

export interface AudienceData {
  locations: string[];
  marketInterests: string[];
  customAudiences: string[];
  ageRange: { min: number; max: number };
  gender: "all" | "male" | "female";
  demographics: string[];
}

export interface BiddingData {
  strategy: "automatic" | "manual";
  manualCpm: number | null;
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

export type ChatMode = "assisted" | "conversational";

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

export type CFONarrativeStatus = "draft" | "final";

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

// --- Approvals ---

export interface ApprovalRequest {
  id: string;
  plan: CampaignPlan;
  sentBy: string;
  sentByName: string;
  sentTo: string;
  sentToName: string;
  sentAt: string;
  comments: ApprovalComment[];
  resolution?: "approved" | "changes-requested" | "rejected";
  resolvedAt?: string;
}
