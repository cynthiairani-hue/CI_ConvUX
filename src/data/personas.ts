import { Persona, GettingStartedTask, PersonaId } from "@/types/persona";

export const personas: Persona[] = [
  {
    id: "cynthia-b2c",
    name: "Cynthia Irani",
    vertical: "b2c",
    verticalLabel: "B2C Marketer",
    initials: "CI",
  },
  {
    id: "cynthia-b2b",
    name: "Cynthia Irani",
    vertical: "b2b",
    verticalLabel: "B2B Marketer",
    initials: "CI",
  },
  {
    id: "cynthia-agency",
    name: "Cynthia Irani",
    vertical: "agency",
    verticalLabel: "Agency Marketer",
    initials: "CI",
  },
  {
    id: "marcus-patel",
    name: "Marcus Patel",
    vertical: "b2c",
    verticalLabel: "VP Marketing",
    initials: "MP",
  },
  {
    id: "jordan-reyes",
    name: "Jordan Reyes",
    vertical: "b2c",
    verticalLabel: "Client Lead",
    initials: "JR",
  },
];

export const universalTasks: GettingStartedTask[] = [
  {
    id: "first-campaign",
    title: "Let's build your first campaign",
    description:
      "The AI will walk you through targeting, budget, and creative — step by step.",
    cta: "Build campaign",
    status: "not-started",
    priority: "essential",
  },
  {
    id: "see-performance",
    title: "See what's performing",
    description:
      "Get an instant view of your marketing performance across channels.",
    cta: "View performance",
    status: "not-started",
    priority: "optional",
  },
  {
    id: "connect-accounts",
    title: "Connect your ad accounts",
    description:
      "Link Google, Meta, TikTok, or LinkedIn to start tracking results.",
    cta: "Connect accounts",
    status: "not-started",
    priority: "optional",
  },
  {
    id: "plan-spend",
    title: "Plan your monthly spend",
    description:
      "Set a budget so the AI can pace and optimize across channels.",
    cta: "Plan spend",
    status: "not-started",
    priority: "optional",
  },
];

// Legacy per-persona tasks kept for dev persona switcher compatibility
export const gettingStartedTasks: Record<PersonaId, GettingStartedTask[]> = {
  "cynthia-b2c": universalTasks,
  "cynthia-b2b": universalTasks,
  "cynthia-agency": universalTasks,
  "marcus-patel": universalTasks,
  "jordan-reyes": universalTasks,
};
