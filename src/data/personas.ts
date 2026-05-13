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
    title: "Build your first campaign",
    description:
      "Launch a retargeting, prospecting, or account-based campaign — the AI will guide you through setup.",
    cta: "Create campaign",
    status: "not-started",
    priority: "essential",
  },
  {
    id: "connect-data",
    title: "Connect a data source",
    description:
      "Link your store, CRM, or analytics platform to unlock audience building and conversion tracking.",
    cta: "Connect data",
    status: "not-started",
    priority: "optional",
  },
  {
    id: "build-audience",
    title: "Build an audience",
    description:
      "Create a retargeting, lookalike, or account-based audience from your data.",
    cta: "Build audience",
    status: "not-started",
    priority: "optional",
  },
  {
    id: "set-budget",
    title: "Set your budget",
    description:
      "Define your monthly ad spend so we can pace and optimize across channels.",
    cta: "Set budget",
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
