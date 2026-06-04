/**
 * Synthetic option sets for the media-plan line-item pickers (audience, geo,
 * keywords). Real-shaped, no real data. Audiences combine these defaults with
 * the user's saved audiences at render time; the picker also offers
 * "Browse marketplace" / "Connect a source" escape hatches.
 */

export interface LineOption {
  id: string;
  label: string;
  meta?: string;
  dot?: string;
}

/** A starter audience library — 1P/CRM (emerald), custom (blue), 3P marketplace (amber). */
export const AUDIENCE_LIBRARY: LineOption[] = [
  { id: "aud-site-30", label: "Site visitors — last 30 days", meta: "182K · Pixel · 1P", dot: "bg-emerald-500" },
  { id: "aud-cart", label: "Cart abandoners — 14 days", meta: "24K · Pixel · 1P", dot: "bg-emerald-500" },
  { id: "aud-crm-all", label: "CRM — all customers", meta: "410K · Salesforce · 1P", dot: "bg-emerald-500" },
  { id: "aud-vip", label: "VIP / loyalty members", meta: "38K · CRM · 1P", dot: "bg-emerald-500" },
  { id: "aud-lookalike", label: "Lookalike — top customers (2%)", meta: "2.1M · Lookalike", dot: "bg-[#2C9FDD]" },
  { id: "aud-streetwear", label: "In-market: streetwear & sneakers", meta: "5.4M · 3P marketplace", dot: "bg-amber-500" },
  { id: "aud-skate", label: "Skate & action-sports enthusiasts", meta: "3.2M · 3P marketplace", dot: "bg-amber-500" },
  { id: "aud-urban", label: "18–34 urban fashion", meta: "8.1M · 3P marketplace", dot: "bg-amber-500" },
];

/** Geo / market taxonomy — national, regions, and top DMAs. */
export const MARKETS: LineOption[] = [
  { id: "geo-us", label: "United States (national)", meta: "All DMAs" },
  { id: "geo-ny", label: "New York", meta: "DMA · 7.4M HH" },
  { id: "geo-la", label: "Los Angeles", meta: "DMA · 5.7M HH" },
  { id: "geo-chi", label: "Chicago", meta: "DMA · 3.5M HH" },
  { id: "geo-sf", label: "San Francisco–Oakland", meta: "DMA · 2.6M HH" },
  { id: "geo-dal", label: "Dallas–Ft. Worth", meta: "DMA · 2.9M HH" },
  { id: "geo-mia", label: "Miami–Ft. Lauderdale", meta: "DMA · 1.8M HH" },
  { id: "geo-sea", label: "Seattle–Tacoma", meta: "DMA · 2.0M HH" },
  { id: "geo-bos", label: "Boston", meta: "DMA · 2.5M HH" },
  { id: "geo-atl", label: "Atlanta", meta: "DMA · 2.5M HH" },
  { id: "geo-ca", label: "California", meta: "State" },
  { id: "geo-tx", label: "Texas", meta: "State" },
];

/** Suggested keywords for the type-ahead (free-create is also allowed). */
export const KEYWORD_SUGGESTIONS: string[] = [
  "skate shoes", "streetwear", "sneakers", "slip-ons", "old skool", "canvas shoes",
  "casual footwear", "skateboarding", "action sports", "youth fashion", "sk8-hi",
  "vans", "off the wall", "retro sneakers", "skate culture", "denim", "graphic tees",
  "summer styles", "back to school", "limited edition drops",
];
