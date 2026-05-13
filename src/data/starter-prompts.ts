import { PersonaId } from "@/types/persona";

export interface StarterPrompt {
  label: string;
  message: string;
}

export const starterPrompts: Record<PersonaId, StarterPrompt[]> = {
  "cynthia-b2c": [
    {
      label: "Build a campaign",
      message: "Help me build a retargeting campaign for cart abandoners",
    },
    {
      label: "Connect my store",
      message: "I want to connect my Shopify store to start tracking conversions",
    },
    {
      label: "Find new customers",
      message: "How can I reach new customers who look like my best buyers?",
    },
  ],
  "cynthia-b2b": [
    {
      label: "Build a campaign",
      message: "Help me build a demand gen campaign to drive demo signups",
    },
    {
      label: "Connect my CRM",
      message: "I want to connect HubSpot to sync my leads and track pipeline",
    },
    {
      label: "Target accounts",
      message: "How do I build an account-based audience from my ICP list?",
    },
  ],
  "cynthia-agency": [
    {
      label: "Add a client",
      message: "I need to set up a new client account for Lumen Organics",
    },
    {
      label: "Build a campaign",
      message:
        "Help me build a prospecting campaign for my client's product launch",
    },
    {
      label: "Client report",
      message: "Can you pull a performance report across all my client accounts?",
    },
  ],
};
