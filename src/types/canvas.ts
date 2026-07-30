/* ── Infinite canvas (Flora-style) ──
   A frame is a positioned window onto a saved artifact. The frame stores only
   layout (position, width, stacking); the artifact itself stays a first-class
   object in CampaignContext — one source of truth, same as everywhere else.
   Removing a frame never deletes the artifact. */

export type CanvasFrameKind = "strategy" | "media-plan" | "audience" | "narrative" | "brief";

export interface CanvasFrame {
  id: string;
  kind: CanvasFrameKind;
  /** id of the saved artifact this frame renders */
  refId: string;
  /** canvas-space position (unscaled) */
  x: number;
  y: number;
  /** frame width in canvas units; height is content-driven */
  w: number;
  /** stacking order — click/drag brings to front */
  z: number;
}

export interface CanvasViewport {
  x: number;
  y: number;
  scale: number;
}

/* ── Client review board ──
   A header card that turns a region of the canvas into the monthly client
   review: it lists what's assembled (narrative, plan, creative) and carries
   the one action that converges the board — Share with client, wired to the
   real media-plan sharing mechanism. */
export interface ReviewBoardCard {
  id: string;
  name: string;
  /** what the assembly found and placed, e.g. ["Performance narrative", …] */
  included: string[];
  /** the media plan this review shares with the client */
  planRefId: string | null;
  status: "draft" | "shared";
  createdAt: string;
  x: number;
  y: number;
}

export interface CanvasWorkspace {
  viewport: CanvasViewport;
  frames: CanvasFrame[];
  boards?: ReviewBoardCard[];
}
