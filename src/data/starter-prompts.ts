import { PersonaId } from "@/types/persona";

export interface StarterPrompt {
  label: string;
  message: string;
}

export const starterPrompts: Record<PersonaId, StarterPrompt[]> = {
  "sarah-chen": [
    {
      label: "Build a campaign",
      message: "Help me build a new campaign for trial signups",
    },
    {
      label: "Analyze performance",
      message: "Show me how my campaigns are performing this week",
    },
    {
      label: "Optimize budget",
      message: "Where should I shift budget to improve ROI?",
    },
  ],
  "marcus-patel": [
    {
      label: "Team summary",
      message: "Give me a summary of the team's campaign performance this quarter",
    },
    {
      label: "Pipeline review",
      message: "What's the current state of our marketing pipeline?",
    },
    {
      label: "Budget allocation",
      message: "How should we reallocate budget across channels?",
    },
  ],
  "jordan-reyes": [
    {
      label: "Campaign updates",
      message: "What's new with my Lumen Organics campaigns?",
    },
    {
      label: "Performance report",
      message: "Can you pull a performance report for this month?",
    },
    {
      label: "Expand reach",
      message: "How can I reach more customers in my target audience?",
    },
  ],
};
