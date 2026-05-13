import { PersonaId } from "@/types/persona";

const responses: Record<PersonaId, Record<string, string>> = {
  "cynthia-b2c": {
    campaign:
      "I'll draft a retargeting campaign plan. First, I need your store URL so I can pull product data and recent visitor segments. Based on typical D2C patterns, I'd recommend starting with cart abandoners — they convert at 3-5x the rate of cold traffic.",
    store:
      "I can connect to Shopify, WooCommerce, or BigCommerce. Once linked, I'll pull your product catalog, recent orders, and visitor data to build your first audience automatically. Which platform are you on?",
    customer:
      "The fastest path to new customers: I'll build a lookalike audience from your top 20% of buyers by LTV. Typically reaches 300-500K addressable users. I'll need your customer list or store connection first — want to start there?",
    budget:
      "For a D2C retargeting campaign, I'd recommend starting with $2-3K/month split across display retargeting (60%) and social prospecting (40%). At that spend level, expect 8-12x ROAS on retargeting and 2-3x on prospecting. Want me to draft a budget plan?",
    audience:
      "Your seed audience needs at least 1,000 records for a strong lookalike model. I can build segments from your store data: cart abandoners, repeat buyers, high-LTV customers, or browse-but-didn't-buy visitors. Which segment matters most right now?",
  },
  "cynthia-b2b": {
    campaign:
      "I'll draft a demand gen campaign plan. For B2B, I'd recommend starting with a LinkedIn + display retargeting combo targeting your ICP. What's your primary conversion event — demo requests, free trial signups, or content downloads?",
    crm: "I can connect to Salesforce, HubSpot, or Marketo. Once linked, I'll sync your lead stages and build attribution from first touch to closed-won. This lets me optimize campaigns against pipeline, not just clicks. Which CRM are you using?",
    account:
      "For account-based targeting, I'll need your ICP list — company names, domains, or firmographic criteria. I can match against our identity graph to reach decision-makers at those accounts across display, social, and email. Upload a list or describe your ICP?",
    budget:
      "For B2B demand gen, I'd recommend $5-8K/month split across account-based display (40%), LinkedIn (35%), and retargeting (25%). Expect 60-90 day attribution cycles. I'll pace spend against your pipeline targets. What's your quarterly pipeline goal?",
    pipeline:
      "I can show pipeline attribution once your CRM is connected. The key metrics I'll track: marketing-sourced pipeline, influenced pipeline, average deal velocity, and cost per MQL. Want to connect your CRM to get started?",
  },
  "cynthia-agency": {
    client:
      "I'll set up a new client account. I need the client name, their vertical (D2C, B2B, or services), and their monthly budget cap. Each client gets isolated campaigns, audiences, and reporting — you can switch between them from the left nav.",
    campaign:
      "Which client is this campaign for? Once you select a client, I'll pull their brand assets, audience data, and historical performance to inform the campaign plan. If this is a new client, we'll need to set up their account first.",
    report:
      "I can generate a cross-client performance report showing: spend vs. budget by client, top-performing campaigns, channel mix, and month-over-month trends. Want a summary dashboard or a detailed per-client breakdown?",
    budget:
      "I'll set up budget guardrails for your client. I need: monthly spend cap, channel allocation preferences, and pacing rules (even daily spend vs. front-loaded). I'll alert you at 80% utilization and pause campaigns at cap. Which client?",
    connect:
      "I can connect to your client's data sources — their store (Shopify, WooCommerce), CRM (Salesforce, HubSpot), or analytics (GA4). This gives us conversion data and audience signals. Which client and which platform?",
  },
};

const fallbacks: Record<PersonaId, string[]> = {
  "cynthia-b2c": [
    "I can help with campaign creation, store connections, audience building, or budget planning. What would you like to start with?",
    "Want to connect your store first, or jump straight into building a campaign?",
    "I'm ready to help you get started. The fastest path is usually: connect your store, build an audience, then launch a campaign.",
  ],
  "cynthia-b2b": [
    "I can help with demand gen campaigns, CRM connections, account-based targeting, or pipeline reporting. Where should we start?",
    "Want to connect your CRM first, or start building your target account list?",
    "I'm ready to help. For B2B, the best starting point is usually connecting your CRM so I can optimize against pipeline, not just clicks.",
  ],
  "cynthia-agency": [
    "I can help you add clients, build campaigns, connect data sources, or generate reports. What do you need?",
    "Want to set up your first client account, or are you looking to build a campaign for an existing client?",
    "I'm here to help manage your client portfolio. Start by adding a client, or I can pull a cross-client report if you have accounts set up.",
  ],
};

const fallbackIndex: Record<PersonaId, number> = {
  "cynthia-b2c": 0,
  "cynthia-b2b": 0,
  "cynthia-agency": 0,
};

export function getAIResponse(
  userMessage: string,
  personaId: PersonaId
): string {
  const lower = userMessage.toLowerCase();
  const personaResponses = responses[personaId];

  for (const [keyword, response] of Object.entries(personaResponses)) {
    if (lower.includes(keyword)) {
      return response;
    }
  }

  const personaFallbacks = fallbacks[personaId];
  const index = fallbackIndex[personaId] % personaFallbacks.length;
  fallbackIndex[personaId]++;
  return personaFallbacks[index];
}

export function getWelcomeMessage(personaId: PersonaId): string {
  const messages: Record<PersonaId, string> = {
    "cynthia-b2c":
      "Welcome to FuseIQ. I'll help you set up your D2C marketing — from connecting your store to launching your first campaign. What would you like to start with?",
    "cynthia-b2b":
      "Welcome to FuseIQ. I'll help you set up your B2B demand gen — from connecting your CRM to building account-based campaigns. Where should we begin?",
    "cynthia-agency":
      "Welcome to FuseIQ. I'll help you manage your client portfolio — from onboarding new accounts to launching campaigns and generating reports. What do you need first?",
  };
  return messages[personaId];
}
