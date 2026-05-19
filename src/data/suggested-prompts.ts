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
      { id: "perf-check", label: `How is ${name} performing?`, category: "performance", priority: 9 },
      { id: "connect-platforms", label: "Connect my ad accounts", category: "performance", priority: 8 },
      { id: "budget-plan", label: `Plan ${name}'s monthly budget`, category: "budget", priority: 7 },
      { id: "retargeting", label: "Build a retargeting campaign", category: "campaign", priority: 6 },
      { id: "audience-explore", label: "What audiences should I target?", category: "audience", priority: 5 },
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
      { id: "cfo-narrative", label: "Draft my CFO narrative for May", category: "narrative", priority: 8 },
      { id: "reallocate", label: "Where should I shift budget?", category: "budget", priority: 7 },
      { id: "retargeting-perf", label: "How is retargeting performing?", category: "performance", priority: 6 },
      { id: "new-campaign", label: `Launch a new campaign for ${name}`, category: "campaign", priority: 5 },
    ];
  }

  // Established user, unknown brand — generic optimization
  return [
    { id: "since-last-visit", label: "What changed since my last visit?", category: "performance", priority: 10 },
    { id: "optimize-top", label: "Top optimization strategies", category: "campaign", priority: 9 },
    { id: "cfo-narrative", label: "Draft my CFO narrative for May", category: "narrative", priority: 8 },
    { id: "compare", label: "Compare my active campaigns", category: "performance", priority: 7 },
    { id: "reallocate", label: "Where should I shift budget?", category: "budget", priority: 6 },
    { id: "new-campaign", label: "Launch a new campaign", category: "campaign", priority: 5 },
  ];
}

// Legacy export for backward compatibility
export const suggestedPrompts = getPersonalizedPrompts(null, 0);
