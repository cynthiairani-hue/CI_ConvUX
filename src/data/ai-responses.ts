import { PersonaId } from "@/types/persona";

const responses: Record<string, string> = {
  campaign:
    "I'll help you build a campaign. First — what's the goal? Are you looking to retarget existing visitors, prospect for new customers, or run account-based targeting?",
  store:
    "I can connect to Shopify, WooCommerce, or BigCommerce. Once linked, I'll pull your product catalog, recent orders, and visitor data to build audiences automatically. Which platform?",
  crm: "I can connect to Salesforce, HubSpot, or Marketo. Once linked, I'll sync your leads and build attribution from first touch to closed-won. Which CRM are you using?",
  connect:
    "I can connect to your store (Shopify, WooCommerce), CRM (Salesforce, HubSpot), or analytics (GA4). Which data source would you like to link first?",
  audience:
    "I can build several audience types: retargeting (site visitors, cart abandoners), lookalikes (from your best customers), or account-based lists (from your ICP). Which approach fits your goal?",
  budget:
    "What's your monthly ad budget? I'll set up pacing rules and optimize allocation across channels. For context, retargeting campaigns typically start seeing strong returns at $2-3K/month.",
  report:
    "I can generate a performance report showing spend, conversions, attributed revenue, and AI recommendations. Want a summary overview or a detailed per-campaign breakdown?",
  customer:
    "The fastest path to new customers: I'll build a lookalike audience from your top buyers. Typically reaches 300-500K addressable users. I'll need a customer list or store connection first — want to start there?",
  account:
    "For account-based targeting, I'll need your ICP list — company names, domains, or firmographic criteria. I can match against our identity graph to reach decision-makers. Upload a list or describe your ICP?",
  pipeline:
    "I can show pipeline attribution once your CRM is connected. Key metrics: marketing-sourced pipeline, influenced pipeline, average deal velocity, and cost per MQL. Want to connect your CRM?",
  client:
    "I'll set up a new client account. I need the client name, their vertical, and monthly budget cap. Each client gets isolated campaigns, audiences, and reporting.",
};

const fallbacks: string[] = [
  "I can help with campaign creation, audience building, data connections, budget planning, or performance reporting. What would you like to start with?",
  "Want to build a campaign, connect a data source, or create an audience? Those are the fastest ways to get value.",
  "I'm ready to help. The best starting point is usually: connect your data, build an audience, then launch a campaign.",
];

let fallbackIndex = 0;

export function getAIResponse(
  userMessage: string,
  personaId: PersonaId // kept for API compatibility
): string {
  void personaId;
  const lower = userMessage.toLowerCase();

  for (const [keyword, response] of Object.entries(responses)) {
    if (lower.includes(keyword)) {
      return response;
    }
  }

  const index = fallbackIndex % fallbacks.length;
  fallbackIndex++;
  return fallbacks[index];
}

export function getWelcomeMessage(personaId: PersonaId): string {
  void personaId;
  return "Welcome to FuseIQ. I can help you build campaigns, connect data sources, create audiences, and optimize performance. What would you like to start with?";
}
