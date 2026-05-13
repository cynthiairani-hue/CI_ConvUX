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
];

export const gettingStartedTasks: Record<PersonaId, GettingStartedTask[]> = {
  "cynthia-b2c": [
    {
      id: "connect-store",
      title: "Connect your store",
      description:
        "Link your Shopify, WooCommerce, or BigCommerce store so we can pull product data and track conversions.",
      cta: "Connect store",
      status: "not-started",
      priority: "essential",
    },
    {
      id: "first-campaign",
      title: "Build your first campaign",
      description:
        "Launch a retargeting or prospecting campaign to start reaching your customers.",
      cta: "Create campaign",
      status: "not-started",
      priority: "essential",
    },
    {
      id: "define-audience",
      title: "Define your audience",
      description:
        "Upload your customer list or let us build a lookalike from your store visitors.",
      cta: "Build audience",
      status: "not-started",
      priority: "optional",
    },
    {
      id: "set-budget",
      title: "Set your budget",
      description:
        "Tell us your monthly ad spend so we can optimize across channels.",
      cta: "Set budget",
      status: "not-started",
      priority: "optional",
    },
  ],
  "cynthia-b2b": [
    {
      id: "connect-crm",
      title: "Connect your CRM",
      description:
        "Link Salesforce, HubSpot, or your CRM to sync leads and track pipeline attribution.",
      cta: "Connect CRM",
      status: "not-started",
      priority: "essential",
    },
    {
      id: "first-campaign",
      title: "Build your first campaign",
      description:
        "Launch an account-based or demand gen campaign to drive demos and trial signups.",
      cta: "Create campaign",
      status: "not-started",
      priority: "essential",
    },
    {
      id: "target-accounts",
      title: "Define your target accounts",
      description:
        "Upload your ICP list or let us build an account-based audience from your CRM data.",
      cta: "Add accounts",
      status: "not-started",
      priority: "optional",
    },
    {
      id: "set-budget",
      title: "Set your budget",
      description:
        "Tell us your quarterly ad budget so we can pace spend across your pipeline goals.",
      cta: "Set budget",
      status: "not-started",
      priority: "optional",
    },
  ],
  "cynthia-agency": [
    {
      id: "add-client",
      title: "Add your first client",
      description:
        "Create a client account to manage their campaigns, budgets, and reporting in one place.",
      cta: "Add client",
      status: "not-started",
      priority: "essential",
    },
    {
      id: "first-campaign",
      title: "Build a campaign for your client",
      description:
        "Launch a campaign on behalf of a client across display, social, and retargeting channels.",
      cta: "Create campaign",
      status: "not-started",
      priority: "essential",
    },
    {
      id: "connect-data",
      title: "Connect client data sources",
      description:
        "Link your client's store, CRM, or analytics to pull in performance data.",
      cta: "Connect data",
      status: "not-started",
      priority: "optional",
    },
    {
      id: "set-budget",
      title: "Set client budgets",
      description:
        "Configure budget caps and pacing rules per client to stay within their spend targets.",
      cta: "Set budgets",
      status: "not-started",
      priority: "optional",
    },
  ],
};
