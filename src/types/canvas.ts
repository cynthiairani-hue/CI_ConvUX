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
  /** explicit height in canvas units once the user resizes the frame; when
      unset the height stays content-driven. A resized frame scrolls its body. */
  h?: number;
  /** collapsed into the bottom taskbar (artifact stays saved; layout retained) */
  minimized?: boolean;
  /** stacking order — click/drag brings to front */
  z: number;
  /** media plans only: the plan is decomposed into a node graph beside the frame */
  expandedLines?: boolean;
  /** media plans only: which funnel stages have their line nodes unfurled */
  expandedStages?: string[];
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

/* ── Marketplace data segment placed on the canvas ──
   Third-party segments from the data marketplace, draggable like any node.
   `attachedTo` wires it to a first-party audience (extend it with paid data)
   — the attach decision always shows the CPM first. */
export interface MarketNode {
  id: string;
  segmentId: string;
  x: number;
  y: number;
  /** refId of the saved audience this segment extends, once attached */
  attachedTo?: string;
}

/** A named camera position — jump back to a saved arrangement (Miro-style). */
export interface SavedView {
  id: string;
  name: string;
  viewport: CanvasViewport;
}

/** A sticky note — lightweight canvas comment, signed by its author persona. */
export interface StickyNote {
  id: string;
  x: number;
  y: number;
  text: string;
  author: string;
  createdAt: string;
}

export interface CanvasWorkspace {
  viewport: CanvasViewport;
  frames: CanvasFrame[];
  boards?: ReviewBoardCard[];
  market?: MarketNode[];
  views?: SavedView[];
  notes?: StickyNote[];
}
