import { PersonaId } from "@/types/persona";

const responses: Record<PersonaId, Record<string, string>> = {
  "sarah-chen": {
    campaign:
      "Drafting a campaign plan now. I'll need your objective, target audience, and budget range. Based on your recent performance, I'd recommend starting with a $3K budget over 30 days targeting your highest-converting segments.",
    performance:
      "Your top campaign — 'Lead with the proof' — is outperforming by 2x on CTR. Confidence is moderate with 14 days of data. The Display channel is driving 68% of impressions but only 41% of conversions. Recommend shifting 20% of Display budget to Retargeting.",
    budget:
      "Based on the last 30 days: Retargeting has the strongest ROI at 5.1x, followed by Paid Social at 3.8x. Display is at 2.1x. Shifting $1,200 from Display to Retargeting would improve blended ROI by an estimated 0.4x. Want me to draft that change?",
    audience:
      "Your current seed audience has 3,200 records — enough for a strong lookalike model. The highest-performing segment is 'Trial users, 25-34, urban.' Want me to build a new audience based on that segment?",
  },
  "marcus-patel": {
    team: "This quarter, the team launched 14 campaigns across 3 channels. Average ROI is 4.2x, up from 3.9x last quarter. Sarah's retargeting campaigns are the top performers. Two campaigns are underperforming — I can flag them for review.",
    pipeline:
      "Marketing-sourced pipeline is at $342K, tracking 18.7% above target. 62% of budget is utilized with 5 weeks remaining in the quarter. At current pace, you'll finish at approximately 89% budget utilization.",
    budget:
      "Channel-level recommendation: increase Retargeting allocation by 15% (highest ROI at 5.1x), hold Paid Social steady, and reduce Display by 10%. Net impact: estimated +$28K pipeline over the remaining quarter.",
    review:
      "Preparing a leadership review deck. Key highlights: 4.2x blended ROI, $342K pipeline, 94% team velocity. Two areas of concern: Display channel efficiency declining, and creative refresh needed on the Lumen Organics account.",
  },
  "jordan-reyes": {
    campaign:
      "Your Lumen Organics account has 6 active campaigns. The top performer is 'Organic Wellness Q2' with a 6.8% engagement rate. Two campaigns launched this month are still in learning phase — I'd recommend waiting 48 hours before making changes.",
    performance:
      "This month's highlights: 892K total reach (+22.1%), 5.12% engagement rate (+1.1%), and $6,680 spent of your $15,000 budget. Your retargeting campaigns are converting at 2.3x your account average.",
    reach:
      "To expand reach, I'd recommend: 1) Building a lookalike audience from your top converters (estimated +340K addressable users), 2) Testing a Paid Social campaign on the 25-34 demographic, 3) Increasing Display frequency cap from 3 to 5 per week.",
    report:
      "Pulling your monthly performance report. It'll include: campaign-level metrics, channel breakdown, audience performance, budget utilization, and my recommendations for next month. I'll have it ready in a moment.",
  },
};

const fallbacks: Record<PersonaId, string[]> = {
  "sarah-chen": [
    "I can help with campaign creation, performance analysis, audience building, or budget optimization. What would you like to focus on?",
    "Want me to pull up your latest campaign metrics or help plan something new?",
    "I'm ready to help. Try asking about campaign performance, budget allocation, or audience targeting.",
  ],
  "marcus-patel": [
    "I can prepare team summaries, pipeline reviews, budget analyses, or leadership reports. What do you need?",
    "Want a quick view of team performance or a deeper dive into a specific channel?",
    "I can help with strategic planning, team oversight, or budget decisions. What's on your mind?",
  ],
  "jordan-reyes": [
    "I can show you campaign updates, performance reports, or help you plan new campaigns. What would you like?",
    "Want to see how your Lumen Organics campaigns are doing or explore new opportunities?",
    "I'm here to help with your account. Try asking about performance, reach, or campaign planning.",
  ],
};

const fallbackIndex: Record<PersonaId, number> = {
  "sarah-chen": 0,
  "marcus-patel": 0,
  "jordan-reyes": 0,
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
    "sarah-chen":
      "Hi Sarah. I have context on your 8 active campaigns and recent performance data. What would you like to work on?",
    "marcus-patel":
      "Hi Marcus. I have your team's quarterly performance and pipeline data ready. What do you need?",
    "jordan-reyes":
      "Hi Jordan. I have your Lumen Organics account data loaded — 6 active campaigns, $8,320 remaining budget. How can I help?",
  };
  return messages[personaId];
}
