import type { AdTile } from "@/types/creative";

/* ── Creative review board ──
   Two rows: what's running now (live tiles with real performance, one of
   them fatiguing) above the proposed refresh variants (predicted lift +
   confidence, each awaiting an explicit Approve/Reject). The comparison IS
   the job — evidence next to the pixels, decision on every tile. */

const U = "https://images.unsplash.com";

/* Hero creative per channel — the image node that hangs off each media-plan
   line in the canvas graph ("how ads show up — everything linked"). */
export const CHANNEL_CREATIVE: Record<string, { imageUrl: string; format: string; headline: string }> = {
  ctv: {
    imageUrl: `${U}/photo-1542291026-7eec264c27ff?w=400&h=225&fit=crop&auto=format`,
    format: "CTV 16:9", headline: "Classics never quit — 30s spot",
  },
  dooh: {
    imageUrl: `${U}/photo-1560769629-975ec94e6a86?w=400&h=225&fit=crop&auto=format`,
    format: "DOOH billboard", headline: "Worn by your city",
  },
  lookalike: {
    imageUrl: `${U}/photo-1595950653106-6c9ebd614d3a?w=400&h=225&fit=crop&auto=format`,
    format: "Display 1:1 set", headline: "New drops. Old soul.",
  },
  social: {
    imageUrl: `${U}/photo-1491553895911-0055eca6402d?w=400&h=225&fit=crop&auto=format`,
    format: "Feed + Story set", headline: "Made for the ones who skate it",
  },
  retargeting: {
    imageUrl: `${U}/photo-1460353581641-37baddab0fa2?w=400&h=225&fit=crop&auto=format`,
    format: "Dynamic display", headline: "Your size is back in stock",
  },
};

export const FALLBACK_CREATIVE = {
  imageUrl: `${U}/photo-1600185365926-3a2ce3cdb9eb?w=400&h=225&fit=crop&auto=format`,
  format: "Display", headline: "Brand creative",
};

const TILE_W = 260;
const COL = TILE_W + 40;

export function buildCreativeReviewBoard(origin: { x: number; y: number }): AdTile[] {
  const uid = `ad-${Date.now().toString(36)}`;
  const { x, y } = origin;
  const row2 = y + 480;
  return [
    {
      id: `${uid}-live-classics`, name: "Classics never quit",
      format: "feed", status: "live",
      imageUrl: `${U}/photo-1542291026-7eec264c27ff?w=600&h=450&fit=crop&auto=format`,
      headline: "Classics never quit",
      angle: "Heritage / identity",
      metrics: { impressions: "1.2M", ctr: 1.8, cpa: 14, trend: "up" },
      provenance: "Live in Site Retargeting · Meta feed · 21 days",
      x, y,
    },
    {
      id: `${uid}-live-community`, name: "Made for the ones who skate it",
      format: "story", status: "live",
      imageUrl: `${U}/photo-1560769629-975ec94e6a86?w=600&h=750&fit=crop&auto=format`,
      headline: "Made for the ones who skate it",
      angle: "Community proof",
      metrics: { impressions: "840K", ctr: 1.1, cpa: 19, trend: "flat" },
      provenance: "Live in Site Retargeting · IG story · 21 days",
      x: x + COL, y,
    },
    {
      id: `${uid}-live-urgency`, name: "Free shipping ends Sunday",
      format: "display", status: "live",
      imageUrl: `${U}/photo-1491553895911-0055eca6402d?w=600&h=600&fit=crop&auto=format`,
      headline: "Free shipping ends Sunday",
      angle: "Urgency / offer",
      metrics: { impressions: "2.1M", ctr: 0.6, cpa: 31, trend: "decaying" },
      provenance: "Live in Site Retargeting · display · 38 days",
      x: x + COL * 2, y,
    },
    {
      id: `${uid}-prop-ugc`, name: "Worn by your city",
      format: "feed", status: "proposed",
      imageUrl: `${U}/photo-1595950653106-6c9ebd614d3a?w=600&h=450&fit=crop&auto=format`,
      headline: "Worn by your city",
      angle: "Social proof — UGC",
      predictedLift: "+14% CTR vs current best",
      confidence: "high",
      provenance: "AI variant of “Classics never quit” · brand asset library",
      x, y: row2,
    },
    {
      id: `${uid}-prop-drop`, name: "New drops. Old soul.",
      format: "story", status: "proposed",
      imageUrl: `${U}/photo-1600185365926-3a2ce3cdb9eb?w=600&h=750&fit=crop&auto=format`,
      headline: "New drops. Old soul.",
      angle: "Product launch tease",
      predictedLift: "+8% CTR vs current story",
      confidence: "medium",
      provenance: "AI variant of “Made for the ones who skate it”",
      x: x + COL, y: row2,
    },
    {
      id: `${uid}-prop-stock`, name: "Your size is back in stock",
      format: "display", status: "proposed",
      imageUrl: `${U}/photo-1460353581641-37baddab0fa2?w=600&h=600&fit=crop&auto=format`,
      headline: "Your size is back in stock",
      angle: "Retargeting — inventory trigger",
      predictedLift: "−22% CPA vs “Free shipping”",
      confidence: "high",
      provenance: "Replacement for the fatiguing urgency tile",
      x: x + COL * 2, y: row2,
    },
  ];
}
