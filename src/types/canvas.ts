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

export interface CanvasWorkspace {
  viewport: CanvasViewport;
  frames: CanvasFrame[];
}
