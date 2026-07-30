/* ── Ad creative tiles on the canvas ──
   Images on a marketer's canvas are exhibits in a decision, never raw
   material. Every tile pairs the creative with its evidence — live tiles
   carry real performance, proposed tiles carry a prediction — and a decision
   state the user controls. Approve/Reject is the Authorize step at tile
   scale; a fatiguing live tile is a Notice. */

export type AdTileStatus = "proposed" | "approved" | "rejected" | "live";

export type AdTileFormat = "feed" | "story" | "display";

export interface AdTileMetrics {
  impressions: string;
  ctr: number;
  cpa: number;
  trend: "up" | "flat" | "decaying";
}

export interface AdTile {
  id: string;
  name: string;
  format: AdTileFormat;
  imageUrl: string;
  headline: string;
  /** the creative angle this tile tests, e.g. "Social proof — UGC" */
  angle: string;
  status: AdTileStatus;
  /** live tiles: real (mocked) performance */
  metrics?: AdTileMetrics;
  /** proposed tiles: the system's prediction, always with confidence */
  predictedLift?: string;
  confidence?: "high" | "medium" | "low";
  /** where this creative came from — asset library, variant lineage */
  provenance: string;
  /** canvas-space position (unscaled) */
  x: number;
  y: number;
}
