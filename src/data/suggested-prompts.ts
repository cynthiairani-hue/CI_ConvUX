export interface SuggestedPrompt {
  id: string;
  label: string;
  category: "campaign" | "audience" | "performance" | "budget" | "narrative";
}

export const suggestedPrompts: SuggestedPrompt[] = [
  { id: "retargeting", label: "Build a retargeting campaign", category: "campaign" },
  { id: "forecast", label: "Forecast next month's spend", category: "budget" },
  { id: "audience-perf", label: "Review audience performance", category: "performance" },
  { id: "compare", label: "Compare my active campaigns", category: "performance" },
  { id: "cfo-narrative", label: "Draft my CFO narrative for May", category: "narrative" },
  { id: "paid-social-changes", label: "What changed in paid social this month?", category: "narrative" },
];
