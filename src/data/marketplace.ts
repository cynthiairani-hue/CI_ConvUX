import type { MediaCampaign, AudienceSegment, MediaChannelKey } from "@/types/campaign";

/* ── Audience data marketplace (mocked catalog) ──
   Third-party segments from the providers named in the audience workstream
   (Experian, Bombora, IOTA). Every segment shows its price up front — segment
   CPM is evidence, shown before anything is attached or billed. */

export interface MarketplaceSegment {
  id: string;
  provider: "Experian" | "Bombora" | "IOTA";
  name: string;
  description: string;
  reach: string;
  cpm: number;
  category: string;
}

export const MARKETPLACE_SEGMENTS: MarketplaceSegment[] = [
  {
    id: "exp-inmarket-footwear",
    provider: "Experian",
    name: "In-market — Footwear & Sneakers",
    description: "Households showing purchase intent for athletic footwear in the last 30 days.",
    reach: "8.2M households",
    cpm: 1.85,
    category: "Purchase intent",
  },
  {
    id: "exp-youth-culture",
    provider: "Experian",
    name: "Youth Culture & Streetwear Affinity",
    description: "16–34 audience indexed on streetwear, skate, and sneaker culture.",
    reach: "12.4M individuals",
    cpm: 1.4,
    category: "Lifestyle affinity",
  },
  {
    id: "bmb-retail-intent",
    provider: "Bombora",
    name: "B2B — Retail Buyers Surge",
    description: "Companies surging on retail merchandising and wholesale apparel topics.",
    reach: "48K companies",
    cpm: 3.1,
    category: "B2B intent",
  },
  {
    id: "iota-cart-abandoners",
    provider: "IOTA",
    name: "Category Cart Abandoners",
    description: "Cross-site cart abandoners in apparel & footwear, deduped against your pixel.",
    reach: "3.1M individuals",
    cpm: 2.4,
    category: "Behavioral",
  },
  {
    id: "iota-ctv-heavy",
    provider: "IOTA",
    name: "CTV Heavy Viewers 18–34",
    description: "High-attention CTV households for incremental reach beyond social.",
    reach: "6.7M households",
    cpm: 2.0,
    category: "Media behavior",
  },
];

export function marketplaceSegment(id: string): MarketplaceSegment | undefined {
  return MARKETPLACE_SEGMENTS.find((s) => s.id === id);
}

/* ── Line → audience resolution ──
   The plan's lines and the audience library are tightly coupled (a line runs
   against a segment); the graph makes that visible. Resolution is by channel
   semantics against the saved library — deterministic on the seeded data. */

const CHANNEL_TO_TYPE: Partial<Record<MediaChannelKey, AudienceSegment["type"][]>> = {
  retargeting: ["retargeting"],
  lookalike: ["lookalike"],
  social: ["interest", "lookalike"],
  ctv: ["interest"],
  dooh: ["interest"],
};

export function audienceForLine(line: MediaCampaign, audiences: AudienceSegment[]): AudienceSegment | null {
  if (audiences.length === 0) return null;
  // Explicit assignment wins when it matches a saved audience by name.
  if (line.audience) {
    const byName = audiences.find((a) => a.name.toLowerCase().includes(line.audience!.toLowerCase()));
    if (byName) return byName;
  }
  const wanted = CHANNEL_TO_TYPE[line.channel] ?? [];
  for (const t of wanted) {
    const match = audiences.find((a) => a.type === t);
    if (match) return match;
  }
  return null;
}
