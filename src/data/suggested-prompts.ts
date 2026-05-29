import type { BrandProfile } from "@/data/brand-profiles";

export interface SuggestedPrompt {
  id: string;
  label: string;
  category: "campaign" | "audience" | "performance" | "budget" | "narrative";
  /** Higher = more important. Used for sorting. */
  priority: number;
}

/**
 * Personalized, journey-aware suggested prompts.
 *
 * Logic:
 * - If brand is known, personalize prompts with brand name and industry context
 * - If user is in first 90 days (fewer saved strategies), prioritize onboarding actions
 * - If user has active campaigns, prioritize optimization and reporting
 */
export function getPersonalizedPrompts(
  brand: BrandProfile | null,
  savedStrategyCount: number,
): SuggestedPrompt[] {
  const name = brand?.name || "your brand";
  const isNew = savedStrategyCount < 2; // First 90 days / new user
  const hasActivity = savedStrategyCount >= 1;

  if (isNew && brand) {
    // New user with known brand — onboarding-first prompts
    return [
      { id: "first-campaign", label: `Build ${name}'s first campaign`, category: "campaign", priority: 10 },
      { id: "competitive", label: "How am I positioned against competitors?", category: "performance", priority: 9 },
      { id: "perf-check", label: `How is ${name} performing?`, category: "performance", priority: 8 },
      { id: "connect-platforms", label: "Connect my ad accounts", category: "performance", priority: 7 },
      { id: "budget-plan", label: `Plan ${name}'s monthly budget`, category: "budget", priority: 6 },
      { id: "retargeting", label: "Build a retargeting campaign", category: "campaign", priority: 5 },
    ];
  }

  if (isNew) {
    // New user, unknown brand — generic onboarding
    return [
      { id: "first-campaign", label: "Build my first campaign", category: "campaign", priority: 10 },
      { id: "connect-platforms", label: "Connect my ad accounts", category: "performance", priority: 9 },
      { id: "perf-check", label: "Show me my marketing performance", category: "performance", priority: 8 },
      { id: "budget-plan", label: "Plan my monthly spend", category: "budget", priority: 7 },
      { id: "retargeting", label: "Build a retargeting campaign", category: "campaign", priority: 6 },
      { id: "audience-explore", label: "What audiences should I target?", category: "audience", priority: 5 },
    ];
  }

  if (hasActivity && brand) {
    // Established user with known brand — optimization & reporting
    return [
      { id: "since-last-visit", label: `What changed since my last visit?`, category: "performance", priority: 10 },
      { id: "optimize-top", label: `Top optimization moves for ${name}`, category: "campaign", priority: 9 },
      { id: "cfo-narrative", label: "Draft my CFO narrative", category: "narrative", priority: 8 },
      { id: "competitive", label: "How am I positioned against competitors?", category: "performance", priority: 7 },
      { id: "reallocate", label: "Where should I shift budget?", category: "budget", priority: 6 },
      { id: "retargeting-perf", label: "How is retargeting performing?", category: "performance", priority: 5 },
    ];
  }

  // Established user, unknown brand — generic optimization
  return [
    { id: "since-last-visit", label: "What changed since my last visit?", category: "performance", priority: 10 },
    { id: "optimize-top", label: "Top optimization strategies", category: "campaign", priority: 9 },
    { id: "cfo-narrative", label: "Draft my CFO narrative", category: "narrative", priority: 8 },
    { id: "compare", label: "Compare my active campaigns", category: "performance", priority: 7 },
    { id: "reallocate", label: "Where should I shift budget?", category: "budget", priority: 6 },
    { id: "new-campaign", label: "Launch a new campaign", category: "campaign", priority: 5 },
  ];
}

// Legacy export for backward compatibility
export const suggestedPrompts = getPersonalizedPrompts(null, 0);

/**
 * Page-contextual prompts for each section of the app.
 * Shown in the page-level chat input dropdown.
 */
export type PageContext = "campaigns" | "audiences" | "reports" | "approvals" | "settings";

export interface PagePrompt {
  id: string;
  label: string;
  /** Matched against user typing for autocomplete */
  keywords: string[];
}

const CAMPAIGN_PROMPTS: PagePrompt[] = [
  { id: "new-campaign", label: "Build a new campaign", keywords: ["build", "new", "create", "campaign", "launch"] },
  { id: "retarget", label: "Build a retargeting campaign", keywords: ["retarget", "retargeting", "website visitors"] },
  { id: "duplicate", label: "Duplicate an existing campaign", keywords: ["duplicate", "copy", "clone"] },
  { id: "optimize", label: "Optimize my top campaign", keywords: ["optimize", "improve", "performance", "top"] },
  { id: "compare", label: "Compare campaign performance", keywords: ["compare", "comparison", "versus", "vs"] },
  { id: "pause", label: "Which campaigns should I pause?", keywords: ["pause", "stop", "underperforming", "low"] },
  { id: "budget-shift", label: "Where should I shift budget?", keywords: ["budget", "shift", "reallocate", "spend"] },
  { id: "forecast", label: "Forecast next month's results", keywords: ["forecast", "predict", "next month", "projection"] },
];

const AUDIENCE_PROMPTS: PagePrompt[] = [
  { id: "build-audience", label: "Build a new audience segment", keywords: ["build", "new", "create", "audience", "segment"] },
  { id: "retargeting-audience", label: "Create a retargeting audience", keywords: ["retarget", "retargeting", "website", "visitors"] },
  { id: "lookalike", label: "Build a lookalike audience", keywords: ["lookalike", "similar", "expand", "look-alike"] },
  { id: "customer-list", label: "Upload a customer list", keywords: ["upload", "customer list", "csv", "import", "crm"] },
  { id: "overlap", label: "Check audience overlap", keywords: ["overlap", "intersection", "duplicate", "redundant"] },
  { id: "suggest", label: "Suggest high-intent audiences", keywords: ["suggest", "recommend", "high-intent", "best"] },
  { id: "refresh", label: "Which audiences need refreshing?", keywords: ["refresh", "stale", "outdated", "old"] },
  { id: "size", label: "Are my audiences large enough?", keywords: ["size", "large", "small", "enough", "too small"] },
];

const REPORT_PROMPTS: PagePrompt[] = [
  { id: "performance-report", label: "Show my marketing performance", keywords: ["performance", "show", "marketing", "overview"] },
  { id: "cfo-narrative", label: "Draft a CFO narrative", keywords: ["cfo", "narrative", "executive", "report", "summary"] },
  { id: "channel-breakdown", label: "Break down performance by channel", keywords: ["channel", "breakdown", "by channel", "display", "social"] },
  { id: "anomaly", label: "Flag any anomalies this week", keywords: ["anomaly", "anomalies", "unusual", "flag", "alert", "spike"] },
  { id: "trend", label: "What's trending up or down?", keywords: ["trend", "trending", "up", "down", "direction"] },
  { id: "roas", label: "What's my ROAS across campaigns?", keywords: ["roas", "return", "ad spend", "roi"] },
  { id: "weekly-digest", label: "Generate a weekly digest", keywords: ["weekly", "digest", "summary", "recap"] },
  { id: "export", label: "Export a report for stakeholders", keywords: ["export", "pdf", "stakeholders", "share", "download"] },
];

const APPROVAL_PROMPTS: PagePrompt[] = [
  { id: "pending", label: "Show pending approvals", keywords: ["pending", "waiting", "approval", "review"] },
  { id: "send-approval", label: "Send a campaign for approval", keywords: ["send", "submit", "approval", "review"] },
  { id: "approval-status", label: "Check approval status", keywords: ["status", "check", "where", "progress"] },
  { id: "remind", label: "Remind approvers about pending items", keywords: ["remind", "nudge", "follow up", "waiting"] },
];

const SETTINGS_PROMPTS: PagePrompt[] = [
  { id: "connect-accounts", label: "Connect my ad accounts", keywords: ["connect", "ad accounts", "google", "meta", "tiktok", "linkedin"] },
  { id: "brand-profile", label: "Update my brand profile", keywords: ["brand", "profile", "update", "company"] },
  { id: "notifications", label: "Configure notifications", keywords: ["notifications", "alerts", "email", "slack"] },
  { id: "team", label: "Manage team members", keywords: ["team", "members", "invite", "users", "access"] },
];

const PAGE_PROMPTS: Record<PageContext, PagePrompt[]> = {
  campaigns: CAMPAIGN_PROMPTS,
  audiences: AUDIENCE_PROMPTS,
  reports: REPORT_PROMPTS,
  approvals: APPROVAL_PROMPTS,
  settings: SETTINGS_PROMPTS,
};

/**
 * Get contextual prompts for a given page.
 * Returns all prompts for the page (for the focus dropdown).
 */
export function getPagePrompts(page: PageContext): PagePrompt[] {
  return PAGE_PROMPTS[page] || [];
}

/**
 * Filter prompts by user input for autocomplete.
 * Matches against label text and keywords.
 */
export function filterPagePrompts(page: PageContext, query: string): PagePrompt[] {
  const prompts = PAGE_PROMPTS[page] || [];
  if (!query.trim()) return prompts;
  const lower = query.toLowerCase();
  return prompts.filter(
    (p) =>
      p.label.toLowerCase().includes(lower) ||
      p.keywords.some((k) => k.includes(lower))
  );
}
