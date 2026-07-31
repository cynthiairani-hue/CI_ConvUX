"use client";

/* ── Infinite canvas (Flora-style) ──
   A pannable/zoomable board where saved artifacts live in draggable frames.
   The frames only hold layout; every card renders the same first-class artifact
   from CampaignContext and edits through the same save methods — two
   modalities, one artifact system. New artifacts built in chat while on this
   page are captured into frames automatically (see the capture effect). */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  BarChart3,
  Check,
  Eraser,
  Frame,
  LayoutList,
  Maximize2,
  Megaphone,
  Minus,
  Plus,
  Presentation,
  Sparkles,
  Image as ImageIcon,
  ListTree,
  Pause,
  Play,
  Swords,
  Trash2,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useCampaign } from "@/contexts/campaign-context";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { cn } from "@/lib/utils";
import { loadCanvas, persistCanvas, loadFlows, persistFlows, loadCreatives, persistCreatives } from "@/lib/storage";
import type { CanvasFrame, CanvasFrameKind, CanvasViewport, MarketNode, ReviewBoardCard as ReviewBoardCardType } from "@/types/canvas";
import { MARKETPLACE_SEGMENTS, marketplaceSegment, audienceForLine } from "@/data/marketplace";
import { MarketNodeCard, MARKET_W, MARKET_H } from "@/components/canvas/market-node";
import type { OrchestrationFlow } from "@/types/orchestration";
import type { AdTile } from "@/types/creative";
import { FLOW_TEMPLATES, createFlowFromTemplate } from "@/data/flow-templates";
import { buildCreativeReviewBoard } from "@/data/creative-templates";
import { FlowWires, FlowNodeCard, NODE_W, NODE_EST_H } from "@/components/canvas/flow-layer";
import { AdTileCard, TILE_W, tileEstHeight } from "@/components/canvas/creative-layer";
import { ReviewBoardHeaderCard, BOARD_W, BOARD_EST_H } from "@/components/canvas/review-board-card";
import { PlanGraph, PlanComposedBody, planGraphExtent, type InspectTarget } from "@/components/canvas/plan-graph";
import { recalcMediaPlan } from "@/data/media-plan-flow";
import { CHANNEL_CREATIVE, FALLBACK_CREATIVE } from "@/data/creative-templates";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getCurrentBrand } from "@/data/brand-profiles";
import { StrategyCard } from "@/components/patterns/strategy-card";
import { MediaPlanCard } from "@/components/patterns/media-plan-card";
import { AudienceCard } from "@/components/patterns/audience-card";
import { CFONarrativeCard } from "@/components/patterns/cfo-narrative-card";
import { CompetitiveBriefCard } from "@/components/patterns/competitive-brief-card";

const MIN_SCALE = 0.25;
const MAX_SCALE = 1.75;
const GRID_SIZE = 24;

/* Below this zoom, frames render as legible covers (semantic zoom) instead of
   shrunken forms — the canvas becomes a portfolio map, not a wall of stamps.
   Set high on purpose: dense editable forms are only worth showing when
   they're actually readable; everything below this is overview territory. */
const LOD_THRESHOLD = 0.7;

const KIND_META: Record<CanvasFrameKind, { label: string; width: number; icon: LucideIcon }> = {
  strategy: { label: "Campaign", width: 620, icon: Megaphone },
  "media-plan": { label: "Media plan", width: 860, icon: LayoutList },
  audience: { label: "Audience", width: 560, icon: Users },
  narrative: { label: "Report", width: 660, icon: BarChart3 },
  brief: { label: "Brief", width: 640, icon: Swords },
};

function frameId(kind: CanvasFrameKind, refId: string): string {
  return `frame-${kind}-${refId}`;
}

/* Estimated frame heights per kind — used for seeding and free-spot placement
   when the frame isn't in the DOM yet. */
const FRAME_EST_H: Record<CanvasFrameKind, number> = {
  strategy: 2050, "media-plan": 1250, audience: 1200, narrative: 1300, brief: 1050,
};

type Rect = { x: number; y: number; w: number; h: number };

/* Slide right past every blocker (plus a gap) until the space is clear. */
function findSpotIn(rects: Rect[], w: number, h: number, startX: number, startY: number): { x: number; y: number } {
  const GAP = 60;
  let x = startX;
  const y = startY;
  for (let i = 0; i < 60; i++) {
    const blocker = rects.find((r) =>
      x < r.x + r.w + GAP && r.x < x + w + GAP && y < r.y + r.h + GAP && r.y < y + h + GAP
    );
    if (!blocker) break;
    x = blocker.x + blocker.w + GAP;
  }
  return { x, y };
}

export function InfiniteCanvas() {
  const {
    savedStrategies, saveStrategy, activeStrategy, setActiveStrategy,
    savedMediaPlans, saveMediaPlan, activeMediaPlan, setActiveMediaPlan,
    savedAudiences, saveAudience, activeAudience, setActiveAudience,
    savedNarratives, saveNarrative, activeNarrative, setActiveNarrative,
    savedBriefs, saveBrief, activeBrief, setActiveBrief,
    shareMediaPlanWithClient, showToast, hydrated,
  } = useCampaign();
  const { state, setState, setPendingContext } = useAICompanion();

  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<CanvasViewport>({ x: 0, y: 0, scale: 1 });
  const [frames, setFrames] = useState<CanvasFrame[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [panning, setPanning] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [flows, setFlows] = useState<OrchestrationFlow[]>([]);
  const [flowsLoaded, setFlowsLoaded] = useState(false);
  const [deletingFlowId, setDeletingFlowId] = useState<string | null>(null);
  const [creatives, setCreatives] = useState<AdTile[]>([]);
  const [creativesLoaded, setCreativesLoaded] = useState(false);
  const [deletingTileId, setDeletingTileId] = useState<string | null>(null);
  const [boards, setBoards] = useState<ReviewBoardCardType[]>([]);
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [market, setMarket] = useState<MarketNode[]>([]);

  /* Live refs so placement always reads current content, even when several
     adds land in the same React tick (rapid clicking, chat captures). */
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const flowsRef = useRef(flows);
  flowsRef.current = flows;
  const creativesRef = useRef(creatives);
  creativesRef.current = creatives;
  const boardsRef = useRef(boards);
  boardsRef.current = boards;
  const framesRef = useRef(frames);
  framesRef.current = frames;
  const marketRef = useRef(market);
  marketRef.current = market;

  const artifactName = useCallback((kind: CanvasFrameKind, refId: string): string | null => {
    switch (kind) {
      case "strategy": return savedStrategies.find((a) => a.id === refId)?.name ?? null;
      case "media-plan": return savedMediaPlans.find((a) => a.id === refId)?.name ?? null;
      case "audience": return savedAudiences.find((a) => a.id === refId)?.name ?? null;
      case "narrative": return savedNarratives.find((a) => a.id === refId)?.name ?? null;
      case "brief": return savedBriefs.find((a) => a.id === refId)?.name ?? null;
    }
  }, [savedStrategies, savedMediaPlans, savedAudiences, savedNarratives, savedBriefs]);

  /** One-line summary for the frame's low-zoom cover. */
  const artifactSummary = useCallback((kind: CanvasFrameKind, refId: string): string | null => {
    switch (kind) {
      case "strategy":
        return savedStrategies.find((a) => a.id === refId)?.objective?.value ?? null;
      case "media-plan": {
        const p = savedMediaPlans.find((a) => a.id === refId);
        if (!p) return null;
        return `$${p.summary.totalBudget.toLocaleString()} · ${p.flight} · ${p.campaigns.filter((c) => c.enabled).length} lines`;
      }
      case "audience": {
        const a = savedAudiences.find((x) => x.id === refId);
        return a ? `Est. size ${a.estimatedSize}` : null;
      }
      case "narrative": {
        const n = savedNarratives.find((x) => x.id === refId);
        if (!n) return null;
        const month = new Date(n.period.year, n.period.month - 1).toLocaleDateString("en-US", { month: "long" });
        return `${month} ${n.period.year} performance review`;
      }
      case "brief":
        return "Market position, competitors, where to win";
    }
  }, [savedStrategies, savedMediaPlans, savedAudiences, savedNarratives]);

  /** Live/paused state for the frame's status chip (null = no chip). */
  const artifactLiveState = useCallback((kind: CanvasFrameKind, refId: string): "active" | "paused" | null => {
    let s: string | undefined;
    switch (kind) {
      case "strategy": s = savedStrategies.find((a) => a.id === refId)?.status; break;
      case "media-plan": s = savedMediaPlans.find((a) => a.id === refId)?.reviewState; break;
      case "audience": s = savedAudiences.find((a) => a.id === refId)?.status; break;
      default: return null;
    }
    return s === "active" || s === "paused" ? s : null;
  }, [savedStrategies, savedMediaPlans, savedAudiences]);

  /* ── Load / seed / persist ── */

  useEffect(() => {
    if (!hydrated || loaded) return;
    const stored = loadCanvas();
    if (stored) {
      setViewport(stored.viewport);
      // Drop frames whose artifact was deleted since last visit.
      setFrames(stored.frames.filter((f) => artifactName(f.kind, f.refId) !== null));
      setBoards(stored.boards ?? []);
      setMarket(stored.market ?? []);
    } else {
      // First visit: seed the board from the most recent saved artifacts.
      const picks: { kind: CanvasFrameKind; refId: string }[] = [];
      savedStrategies.slice(-2).forEach((s) => picks.push({ kind: "strategy", refId: s.id }));
      savedMediaPlans.slice(-1).forEach((p) => picks.push({ kind: "media-plan", refId: p.id }));
      savedAudiences.slice(-1).forEach((a) => picks.push({ kind: "audience", refId: a.id }));
      savedNarratives.slice(-1).forEach((n) => picks.push({ kind: "narrative", refId: n.id }));
      savedBriefs.slice(-1).forEach((b) => picks.push({ kind: "brief", refId: b.id }));
      const colX = [60, 1020];
      const colY = [60, 60];
      setFrames(picks.map((p, i) => {
        const col = i % 2;
        const y = colY[col];
        colY[col] += FRAME_EST_H[p.kind] + 80;
        return { id: frameId(p.kind, p.refId), kind: p.kind, refId: p.refId, x: colX[col], y, w: KIND_META[p.kind].width, z: i + 1 };
      }));
    }
    setLoaded(true);
  }, [hydrated, loaded, artifactName, savedStrategies, savedMediaPlans, savedAudiences, savedNarratives, savedBriefs]);

  useEffect(() => {
    if (loaded) persistCanvas({ viewport, frames, boards, market });
  }, [viewport, frames, boards, market, loaded]);

  useEffect(() => {
    if (!hydrated || flowsLoaded) return;
    setFlows(loadFlows());
    setFlowsLoaded(true);
  }, [hydrated, flowsLoaded]);

  useEffect(() => {
    if (flowsLoaded) persistFlows(flows);
  }, [flows, flowsLoaded]);

  useEffect(() => {
    if (!hydrated || creativesLoaded) return;
    setCreatives(loadCreatives());
    setCreativesLoaded(true);
  }, [hydrated, creativesLoaded]);

  useEffect(() => {
    if (creativesLoaded) persistCreatives(creatives);
  }, [creatives, creativesLoaded]);

  /* ── Free-spot placement ──
     New content lands near the viewport center, but never on top of existing
     content — it slides sideways past whatever is in the way. */

  const frameRects = useCallback((fs: CanvasFrame[]): Rect[] => {
    const el = containerRef.current;
    return fs.map((f) => {
      const node = el?.querySelector<HTMLElement>(`[data-frame-id="${f.id}"]`);
      return { x: f.x, y: f.y, w: f.w, h: node?.offsetHeight ?? FRAME_EST_H[f.kind] };
    });
  }, []);

  const nonFrameRects = useCallback((): Rect[] => {
    const rects: Rect[] = [];
    flowsRef.current.forEach((fl) => fl.nodes.forEach((n) => rects.push({ x: n.x, y: n.y, w: NODE_W, h: NODE_EST_H[n.kind] })));
    creativesRef.current.forEach((t) => rects.push({ x: t.x, y: t.y, w: TILE_W, h: tileEstHeight(t) }));
    boardsRef.current.forEach((b) => rects.push({ x: b.x, y: b.y, w: BOARD_W, h: BOARD_EST_H }));
    marketRef.current.forEach((m) => rects.push({ x: m.x, y: m.y, w: MARKET_W, h: MARKET_H }));
    return rects;
  }, []);

  const findFreeSpot = useCallback((w: number, h: number, startX: number, startY: number): { x: number; y: number } => {
    return findSpotIn([...frameRects(framesRef.current), ...nonFrameRects()], w, h, startX, startY);
  }, [frameRects, nonFrameRects]);

  /** Canvas-space point at the center of the current view. */
  const viewCenter = useCallback((): { x: number; y: number } => {
    const el = containerRef.current;
    const cw = el?.clientWidth ?? 1200;
    const ch = el?.clientHeight ?? 800;
    const v = viewportRef.current;
    return { x: (cw / 2 - v.x) / v.scale, y: (ch / 2 - v.y) / v.scale };
  }, []);

  /* ── Frame management ── */

  const addFrame = useCallback((kind: CanvasFrameKind, refId: string) => {
    const w = KIND_META[kind].width;
    const c = viewCenter();
    // Placement is computed inside the updater from `prev`, so several adds in
    // the same tick (rapid clicks, chat captures) still see each other.
    setFrames((prev) => {
      const maxZ = prev.reduce((m, f) => Math.max(m, f.z), 0);
      const existing = prev.find((f) => f.kind === kind && f.refId === refId);
      if (existing) {
        // Already on the board — just bring it to front.
        return prev.map((f) => (f.id === existing.id ? { ...f, z: maxZ + 1 } : f));
      }
      const spot = findSpotIn(
        [...frameRects(prev), ...nonFrameRects()],
        w, FRAME_EST_H[kind], c.x - w / 2, c.y - 220
      );
      return [...prev, { id: frameId(kind, refId), kind, refId, x: spot.x, y: spot.y, w, z: maxZ + 1 }];
    });
  }, [viewCenter, frameRects, nonFrameRects]);

  const removeFrame = useCallback((id: string) => {
    setFrames((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const bringToFront = useCallback((id: string) => {
    setFrames((prev) => {
      const maxZ = prev.reduce((m, f) => Math.max(m, f.z), 0);
      const target = prev.find((f) => f.id === id);
      if (!target || target.z === maxZ) return prev;
      return prev.map((f) => (f.id === id ? { ...f, z: maxZ + 1 } : f));
    });
  }, []);

  const moveFrame = useCallback((id: string, x: number, y: number) => {
    setFrames((prev) => prev.map((f) => (f.id === id ? { ...f, x, y } : f)));
  }, []);

  const toggleExpandLines = useCallback((id: string) => {
    setFrames((prev) => {
      const maxZ = prev.reduce((m, f) => Math.max(m, f.z), 0);
      // Expanding is an act of focus — the plan and its graph come to front,
      // and the WHOLE workflow reveals at once (Flora-style): every stage's
      // lines unfurled. Collapsing stages back is per-stage, on the nodes.
      return prev.map((f) => (f.id === id
        ? {
            ...f,
            expandedLines: !f.expandedLines,
            expandedStages: f.expandedLines ? f.expandedStages : ["awareness", "consideration", "conversion"],
            z: maxZ + 1,
          }
        : f));
    });
  }, []);

  const toggleStage = useCallback((frameId: string, stage: string) => {
    setFrames((prev) => prev.map((f) => {
      if (f.id !== frameId) return f;
      const set = new Set(f.expandedStages ?? []);
      if (set.has(stage)) set.delete(stage); else set.add(stage);
      return { ...f, expandedStages: Array.from(set) };
    }));
  }, []);

  /** Every graph action writes through the same artifact + recalc path. */
  const updatePlanFromGraph = useCallback((updated: import("@/types/campaign").MediaPlan, toast?: string) => {
    saveMediaPlan(updated);
    if (toast) showToast(toast);
  }, [saveMediaPlan, showToast]);

  /* Line selection for bulk actions (launch / pause / remove across lines). */
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());
  const [pendingLineRemoval, setPendingLineRemoval] = useState<{ planId: string; ids: string[] } | null>(null);
  /* Click-to-inspect (Flora-style right panel for the selected node). */
  const [inspected, setInspected] = useState<InspectTarget | null>(null);

  const toggleLineSelection = useCallback((lineId: string) => {
    setSelectedLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId); else next.add(lineId);
      return next;
    });
  }, []);

  const selectLines = useCallback((ids: string[]) => {
    setSelectedLines(new Set(ids));
  }, []);

  const clearLineSelection = useCallback(() => setSelectedLines(new Set()), []);

  /* ── Flow management (the orchestration layer) ── */

  const addFlowFromTemplate = useCallback((templateId: string) => {
    const template = FLOW_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const totalW = NODE_W + 380 * 2; // trigger → condition → actions, three columns
    const c = viewCenter();
    const spot = findFreeSpot(totalW, 440, c.x - totalW / 2, c.y - 200);
    setFlows((prev) => [...prev, createFlowFromTemplate(template, spot)]);
  }, [findFreeSpot, viewCenter]);

  const moveFlowNode = useCallback((flowId: string, nodeId: string, x: number, y: number) => {
    setFlows((prev) => prev.map((f) =>
      f.id === flowId
        ? { ...f, nodes: f.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)) }
        : f
    ));
  }, []);

  const authorizeFlowAction = useCallback((flowId: string, nodeId: string) => {
    setFlows((prev) => prev.map((f) =>
      f.id === flowId
        ? {
            ...f,
            lastModifiedAt: new Date().toISOString(),
            nodes: f.nodes.map((n) => (n.id === nodeId ? { ...n, authorized: !n.authorized } : n)),
          }
        : f
    ));
  }, []);

  const activateFlow = useCallback((flowId: string) => {
    setFlows((prev) => prev.map((f) =>
      f.id === flowId ? { ...f, status: "active" as const, lastModifiedAt: new Date().toISOString() } : f
    ));
    showToast("Flow activated — actions run when the trigger fires (simulated)");
  }, [showToast]);

  const pauseFlow = useCallback((flowId: string) => {
    setFlows((prev) => prev.map((f) =>
      f.id === flowId ? { ...f, status: "paused" as const, lastModifiedAt: new Date().toISOString() } : f
    ));
    showToast("Flow paused — no actions will run");
  }, [showToast]);

  /* Upsert a frame at an explicit position (used by board assembly). */
  const placeFrame = useCallback((kind: CanvasFrameKind, refId: string, x: number, y: number) => {
    setFrames((prev) => {
      const maxZ = prev.reduce((m, f) => Math.max(m, f.z), 0);
      const existing = prev.find((f) => f.kind === kind && f.refId === refId);
      if (existing) return prev.map((f) => (f.id === existing.id ? { ...f, x, y, z: maxZ + 1 } : f));
      return [...prev, { id: frameId(kind, refId), kind, refId, x, y, w: KIND_META[kind].width, z: maxZ + 1 }];
    });
  }, []);

  /* ── Client review board (the canvas as the meeting) ── */

  const addClientReviewBoard = useCallback(() => {
    const narrative = savedNarratives[savedNarratives.length - 1] ?? null;
    const plan = savedMediaPlans[savedMediaPlans.length - 1] ?? null;
    if (!narrative && !plan) {
      showToast("Nothing to assemble yet — save a report or media plan first");
      return;
    }
    // The assembled board spans header + narrative + plan; find room for all of it.
    const blockW = BOARD_W + 60 + KIND_META.narrative.width + 60 + KIND_META["media-plan"].width;
    const c = viewCenter();
    const spot = findFreeSpot(blockW, 1300, c.x - blockW / 2, c.y - 250);
    const ox = spot.x;
    const oy = spot.y;
    const included: string[] = [];
    let x = ox + BOARD_W + 60;
    if (narrative) {
      placeFrame("narrative", narrative.id, x, oy);
      included.push("Performance narrative");
      x += KIND_META.narrative.width + 60;
    }
    if (plan) {
      placeFrame("media-plan", plan.id, x, oy);
      included.push(`Media plan — ${plan.name}`);
    }
    if (creatives.length > 0) included.push(`${creatives.length} creative tiles on canvas`);
    const brand = getCurrentBrand();
    setBoards((prev) => [...prev, {
      id: `board-${Date.now().toString(36)}`,
      name: `${brand?.name ?? "Client"} — monthly review`,
      included,
      planRefId: plan?.id ?? null,
      status: "draft",
      createdAt: new Date().toISOString(),
      x: ox,
      y: oy,
    }]);
  }, [savedNarratives, savedMediaPlans, creatives.length, placeFrame, showToast, findFreeSpot, viewCenter]);

  const moveBoard = useCallback((id: string, x: number, y: number) => {
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, x, y } : b)));
  }, []);

  const shareBoard = useCallback((boardId: string) => {
    const board = boards.find((b) => b.id === boardId);
    if (!board) return;
    // Real mechanism: the shared plan shows up in the client persona's portal.
    if (board.planRefId) shareMediaPlanWithClient(board.planRefId, "jordan-reyes");
    setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, status: "shared" as const } : b)));
    showToast("Shared with Jordan Reyes — client notified (simulated)");
  }, [boards, shareMediaPlanWithClient, showToast]);

  const askAboutBoard = useCallback((board: ReviewBoardCardType) => {
    setPendingContext({
      label: `Review · ${board.name}`,
      detail: `The user selected the client review board "${board.name}" (${board.status}) containing: ${board.included.join(", ")}. Ground your answer in this review.`,
    });
    if (state === "resting" || state === "fullscreen") setState("floating");
  }, [setPendingContext, setState, state]);

  /* ── Clear canvas (frames and boards only reference artifacts; flows and
        creatives live on the canvas, so clearing deletes those) ── */

  const clearCanvas = useCallback(() => {
    setFrames([]);
    setFlows([]);
    setCreatives([]);
    setBoards([]);
    setMarket([]);
    setConfirmingClear(false);
    showToast("Canvas cleared — saved artifacts are still in your workspace");
  }, [showToast]);

  /* ── Marketplace segment nodes ── */

  const addMarketNode = useCallback((segmentId: string) => {
    const c = viewCenter();
    const spot = findFreeSpot(MARKET_W, MARKET_H, c.x - MARKET_W / 2, c.y - MARKET_H / 2);
    setMarket((prev) => [...prev, { id: `mkt-${Date.now().toString(36)}`, segmentId, x: spot.x, y: spot.y }]);
  }, [findFreeSpot, viewCenter]);

  const moveMarketNode = useCallback((id: string, x: number, y: number) => {
    setMarket((prev) => prev.map((m) => (m.id === id ? { ...m, x, y } : m)));
  }, []);

  const attachMarketNode = useCallback((nodeId: string, audienceId: string | null) => {
    const node = market.find((m) => m.id === nodeId);
    const seg = node && marketplaceSegment(node.segmentId);
    setMarket((prev) => prev.map((m) => (m.id === nodeId ? { ...m, attachedTo: audienceId ?? undefined } : m)));
    if (audienceId) {
      const aud = savedAudiences.find((a) => a.id === audienceId);
      // Make the extension visible: the audience joins the canvas and the wire draws.
      addFrame("audience", audienceId);
      showToast(`${seg?.name ?? "Segment"} attached — extends ${aud?.name ?? "audience"} at $${seg?.cpm.toFixed(2)} CPM on matched impressions`);
    } else {
      showToast("Segment detached — no data cost while unattached");
    }
  }, [market, savedAudiences, addFrame, showToast]);

  /* ── Creative tiles (images as exhibits in a decision) ── */

  const addCreativeBoard = useCallback(() => {
    const totalW = TILE_W * 3 + 80;
    const c = viewCenter();
    const spot = findFreeSpot(totalW, 1000, c.x - totalW / 2, c.y - 320);
    setCreatives((prev) => [...prev, ...buildCreativeReviewBoard(spot)]);
  }, [findFreeSpot, viewCenter]);

  const moveTile = useCallback((id: string, x: number, y: number) => {
    setCreatives((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)));
  }, []);

  const decideTile = useCallback((id: string, status: AdTile["status"]) => {
    setCreatives((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }, []);

  const askAboutTile = useCallback((tile: AdTile) => {
    const evidence = tile.metrics
      ? `live — ${tile.metrics.ctr}% CTR, $${tile.metrics.cpa} CPA, ${tile.metrics.impressions} impressions, trend ${tile.metrics.trend}`
      : `proposed — ${tile.predictedLift ?? "no prediction"}, ${tile.confidence ?? "unknown"} confidence`;
    setPendingContext({
      label: `Creative · ${tile.headline}`,
      detail: `The user selected the ad creative "${tile.headline}" (${tile.format}, angle: ${tile.angle}, status: ${tile.status}, ${evidence}) on their canvas. Ground your answer in this creative.`,
    });
    if (state === "resting" || state === "fullscreen") setState("floating");
  }, [setPendingContext, setState, state]);

  const askAboutFlow = useCallback((flow: OrchestrationFlow) => {
    const shape = flow.nodes.map((n) => `${n.kind}: ${n.title}`).join(" → ");
    setPendingContext({
      label: `Flow · ${flow.name}`,
      detail: `The user selected the orchestration flow "${flow.name}" (status: ${flow.status}) on their canvas — ${shape}. Ground your answer in this flow.`,
    });
    if (state === "resting" || state === "fullscreen") setState("floating");
  }, [setPendingContext, setState, state]);

  /* ── Capture: artifacts built in chat while on this page land as frames ──
     Flows set an active artifact; instead of the split-canvas takeover
     (bypassed on /canvas by AppShell), we save it, frame it, and clear the
     active pointer. The artifact stays fully editable inside its frame. */

  useEffect(() => {
    if (!loaded) return;
    if (activeStrategy) {
      saveStrategy(activeStrategy);
      addFrame("strategy", activeStrategy.id);
      setActiveStrategy(null);
    }
    if (activeMediaPlan) {
      saveMediaPlan(activeMediaPlan);
      addFrame("media-plan", activeMediaPlan.id);
      setActiveMediaPlan(null);
    }
    if (activeAudience) {
      saveAudience(activeAudience);
      addFrame("audience", activeAudience.id);
      setActiveAudience(null);
    }
    if (activeNarrative) {
      saveNarrative(activeNarrative);
      addFrame("narrative", activeNarrative.id);
      setActiveNarrative(null);
    }
    if (activeBrief) {
      saveBrief(activeBrief);
      addFrame("brief", activeBrief.id);
      setActiveBrief(null);
    }
  }, [
    loaded, addFrame,
    activeStrategy, saveStrategy, setActiveStrategy,
    activeMediaPlan, saveMediaPlan, setActiveMediaPlan,
    activeAudience, saveAudience, setActiveAudience,
    activeNarrative, saveNarrative, setActiveNarrative,
    activeBrief, saveBrief, setActiveBrief,
  ]);

  /* ── Pan (background drag) ── */

  const panRef = useRef<{ startX: number; startY: number; vx: number; vy: number } | null>(null);

  function onBackgroundPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-canvas-frame]") || target.closest("[data-canvas-ui]")) return;
    e.preventDefault(); // keep the drag from selecting text across frames
    panRef.current = { startX: e.clientX, startY: e.clientY, vx: viewport.x, vy: viewport.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    setPanning(true);
    setAddOpen(false);
    setInspected(null); // clicking empty canvas dismisses the inspector
  }

  function onBackgroundPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    if (!pan) return;
    setViewport((v) => ({ ...v, x: pan.vx + e.clientX - pan.startX, y: pan.vy + e.clientY - pan.startY }));
  }

  function onBackgroundPointerUp() {
    panRef.current = null;
    setPanning(false);
  }

  /* ── Zoom (pinch / ⌘-scroll zooms to cursor; plain scroll pans) ── */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el!.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        setViewport((v) => {
          const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * Math.exp(-e.deltaY * 0.0015)));
          const k = scale / v.scale;
          return { scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
        });
      } else {
        setViewport((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const el = containerRef.current;
    const cw = el?.clientWidth ?? 1200;
    const ch = el?.clientHeight ?? 800;
    setViewport((v) => {
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      const k = scale / v.scale;
      return { scale, x: cw / 2 - (cw / 2 - v.x) * k, y: ch / 2 - (ch / 2 - v.y) * k };
    });
  }, []);

  const fitToContent = useCallback(() => {
    const el = containerRef.current;
    if (!el || (frames.length === 0 && flows.length === 0)) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    frames.forEach((f) => {
      const node = el.querySelector<HTMLElement>(`[data-frame-id="${f.id}"]`);
      const h = node?.offsetHeight ?? 420;
      minX = Math.min(minX, f.x);
      minY = Math.min(minY, f.y);
      maxX = Math.max(maxX, f.x + f.w);
      maxY = Math.max(maxY, f.y + h);
    });
    flows.forEach((flow) => flow.nodes.forEach((n) => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + NODE_W);
      maxY = Math.max(maxY, n.y + NODE_EST_H[n.kind]);
    }));
    creatives.forEach((t) => {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + TILE_W);
      maxY = Math.max(maxY, t.y + tileEstHeight(t));
    });
    boards.forEach((b) => {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + BOARD_W);
      maxY = Math.max(maxY, b.y + BOARD_EST_H);
    });
    market.forEach((m) => {
      minX = Math.min(minX, m.x);
      minY = Math.min(minY, m.y);
      maxX = Math.max(maxX, m.x + MARKET_W);
      maxY = Math.max(maxY, m.y + MARKET_H);
    });
    frames.filter((f) => f.kind === "media-plan" && f.expandedLines).forEach((f) => {
      const plan = savedMediaPlans.find((p) => p.id === f.refId);
      if (!plan) return;
      const ext = planGraphExtent(f, plan);
      maxX = Math.max(maxX, ext.maxX);
      maxY = Math.max(maxY, ext.maxY);
    });
    const pad = 60;
    const cw = el.clientWidth, ch = el.clientHeight;
    const scale = Math.min(1, Math.max(MIN_SCALE, Math.min((cw - pad * 2) / (maxX - minX), (ch - pad * 2) / (maxY - minY))));
    setViewport({
      scale,
      x: (cw - (maxX - minX) * scale) / 2 - minX * scale,
      y: (ch - (maxY - minY) * scale) / 2 - minY * scale,
    });
  }, [frames, flows, creatives, boards, market, savedMediaPlans]);

  /* ── Frame → chat context (Notice → Propose → Authorize entry point) ── */

  const askAboutFrame = useCallback((frame: CanvasFrame) => {
    const name = artifactName(frame.kind, frame.refId) ?? "artifact";
    const meta = KIND_META[frame.kind];
    setPendingContext({
      label: `${meta.label} · ${name}`,
      detail: `The user selected the ${meta.label.toLowerCase()} "${name}" on their canvas. Ground your answer in this artifact.`,
    });
    if (state === "resting" || state === "fullscreen") setState("floating");
  }, [artifactName, setPendingContext, setState, state]);

  /* ── Render helpers ── */

  const renderArtifact = useCallback((frame: CanvasFrame) => {
    switch (frame.kind) {
      case "strategy": {
        const plan = savedStrategies.find((s) => s.id === frame.refId);
        return plan ? <StrategyCard plan={plan} onUpdate={saveStrategy} /> : null;
      }
      case "media-plan": {
        const plan = savedMediaPlans.find((p) => p.id === frame.refId);
        return plan ? <MediaPlanCard plan={plan} onChange={saveMediaPlan} readOnly={false} /> : null;
      }
      case "audience": {
        const segment = savedAudiences.find((a) => a.id === frame.refId);
        return segment ? <AudienceCard segment={segment} onUpdate={saveAudience} /> : null;
      }
      case "narrative": {
        const narrative = savedNarratives.find((n) => n.id === frame.refId);
        return narrative ? (
          <CFONarrativeCard
            narrative={narrative}
            hideHeaderActions
            onSendToCFO={() => showToast("Narrative shared — simulated notification sent")}
          />
        ) : null;
      }
      case "brief": {
        const brief = savedBriefs.find((b) => b.id === frame.refId);
        return brief ? (
          <CompetitiveBriefCard brief={brief} onConnectPixel={() => showToast("Pixel connection — simulated")} />
        ) : null;
      }
    }
  }, [savedStrategies, saveStrategy, savedMediaPlans, saveMediaPlan, savedAudiences, saveAudience, savedNarratives, savedBriefs, showToast]);

  // Saved artifacts not yet on the board, for the Add menu.
  const unframed: { kind: CanvasFrameKind; refId: string; name: string }[] = [
    ...savedStrategies.map((s) => ({ kind: "strategy" as const, refId: s.id, name: s.name })),
    ...savedMediaPlans.map((p) => ({ kind: "media-plan" as const, refId: p.id, name: p.name })),
    ...savedAudiences.map((a) => ({ kind: "audience" as const, refId: a.id, name: a.name })),
    ...savedNarratives.map((n) => ({ kind: "narrative" as const, refId: n.id, name: n.name })),
    ...savedBriefs.map((b) => ({ kind: "brief" as const, refId: b.id, name: b.name })),
  ].filter((a) => !frames.some((f) => f.kind === a.kind && f.refId === a.refId));

  return (
    <>
    <div
      ref={containerRef}
      className={cn("relative h-full w-full flex-1 overflow-hidden bg-[#F7F9FB]", panning ? "cursor-grabbing select-none" : "cursor-grab")}
      style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
        backgroundSize: `${GRID_SIZE * viewport.scale}px ${GRID_SIZE * viewport.scale}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
      }}
      onPointerDown={onBackgroundPointerDown}
      onPointerMove={onBackgroundPointerMove}
      onPointerUp={onBackgroundPointerUp}
      onPointerCancel={onBackgroundPointerUp}
    >
      {/* Content layer — the camera */}
      <div
        className="absolute left-0 top-0"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`, transformOrigin: "0 0" }}
      >
        <FlowWires flows={flows} />
        {/* Marketplace attachment wires — dotted: a data feed, not a build step */}
        <svg className="absolute left-0 top-0 overflow-visible" width={1} height={1} aria-hidden>
          {market.filter((m) => m.attachedTo).map((m) => {
            const f = frames.find((fr) => fr.kind === "audience" && fr.refId === m.attachedTo);
            if (!f) return null;
            const sx = m.x + MARKET_W, sy = m.y + 48;
            const tx = f.x, ty = f.y + 90;
            return (
              <g key={`wire-${m.id}`}>
                <path
                  d={`M ${sx} ${sy} C ${sx + 60} ${sy}, ${tx - 60} ${ty}, ${tx} ${ty}`}
                  fill="none"
                  stroke="hsl(var(--muted-foreground) / 0.5)"
                  strokeWidth={1.25}
                  strokeDasharray="2 4"
                />
                <circle cx={sx} cy={sy} r={3.5} fill="white" stroke="hsl(var(--muted-foreground) / 0.5)" strokeWidth={1.5} />
                <circle cx={tx} cy={ty} r={3.5} fill="white" stroke="hsl(var(--muted-foreground) / 0.5)" strokeWidth={1.5} />
              </g>
            );
          })}
        </svg>
        {market.map((m) => {
          const seg = marketplaceSegment(m.segmentId);
          if (!seg) return null;
          return (
            <MarketNodeCard
              key={m.id}
              node={m}
              segment={seg}
              attachedName={m.attachedTo ? savedAudiences.find((a) => a.id === m.attachedTo)?.name ?? null : null}
              isInspected={inspected?.kind === "market" && inspected.nodeId === m.id}
              scale={viewport.scale}
              onMove={moveMarketNode}
              onInspect={() => setInspected({ kind: "market", nodeId: m.id })}
              onRemove={(id) => setMarket((prev) => prev.filter((x) => x.id !== id))}
            />
          );
        })}
        {frames.filter((f) => f.kind === "media-plan" && f.expandedLines).map((f) => {
          const plan = savedMediaPlans.find((p) => p.id === f.refId);
          return plan ? (
            <PlanGraph
              key={`graph-${f.id}`}
              frame={f}
              plan={plan}
              audiences={savedAudiences}
              onUpdate={updatePlanFromGraph}
              onToggleStage={toggleStage}
              selected={selectedLines}
              onToggleSelect={toggleLineSelection}
              onSelectAll={selectLines}
              onClearSelection={clearLineSelection}
              onRequestRemove={(ids) => setPendingLineRemoval({ planId: plan.id, ids })}
              inspected={inspected}
              onInspect={setInspected}
            />
          ) : null;
        })}
        {boards.map((board) => (
          <ReviewBoardHeaderCard
            key={board.id}
            board={board}
            scale={viewport.scale}
            onMove={moveBoard}
            onShare={shareBoard}
            onDelete={setDeletingBoardId}
            onAsk={askAboutBoard}
          />
        ))}
        {creatives.map((tile) => (
          <AdTileCard
            key={tile.id}
            tile={tile}
            scale={viewport.scale}
            onMove={moveTile}
            onDecide={decideTile}
            onDelete={setDeletingTileId}
            onAsk={askAboutTile}
          />
        ))}
        {flows.map((flow) =>
          flow.nodes.map((node) => (
            <FlowNodeCard
              key={node.id}
              flow={flow}
              node={node}
              scale={viewport.scale}
              onMove={moveFlowNode}
              onAuthorize={authorizeFlowAction}
              onActivate={activateFlow}
              onPause={pauseFlow}
              onDelete={setDeletingFlowId}
              onAsk={askAboutFlow}
            />
          ))
        )}
        {frames.map((frame) => (
          <FrameShell
            key={frame.id}
            frame={frame}
            name={artifactName(frame.kind, frame.refId) ?? "Untitled"}
            liveState={artifactLiveState(frame.kind, frame.refId)}
            summary={artifactSummary(frame.kind, frame.refId)}
            lod={viewport.scale < LOD_THRESHOLD}
            expandable={frame.kind === "media-plan"}
            onToggleExpand={toggleExpandLines}
            composedBody={
              frame.kind === "media-plan" && frame.expandedLines
                ? (() => {
                    const p = savedMediaPlans.find((x) => x.id === frame.refId);
                    return p ? <PlanComposedBody plan={p} onUpdate={updatePlanFromGraph} /> : null;
                  })()
                : null
            }
            scale={viewport.scale}
            onMove={moveFrame}
            onFocus={bringToFront}
            onRemove={removeFrame}
            onAsk={askAboutFrame}
          >
            {renderArtifact(frame)}
          </FrameShell>
        ))}
      </div>

      {/* Toolbar */}
      <div data-canvas-ui className="absolute left-4 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-0.5 rounded-xl border border-border bg-white p-1 shadow-md">
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.25)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setViewport((v) => ({ ...v, scale: 1 }))}
          className="min-w-[48px] rounded-lg px-1.5 py-1 text-center text-[12px] font-medium tabular-nums text-foreground transition-colors hover:bg-accent"
          title="Reset zoom"
        >
          {Math.round(viewport.scale * 100)}%
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1.25)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="my-0.5 h-px w-5 bg-border" />
        <button
          type="button"
          onClick={fitToContent}
          disabled={frames.length === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          title="Fit everything in view"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <div className="my-0.5 h-px w-5 bg-border" />
        <div className="relative">
          <button
            type="button"
            onClick={() => setAddOpen((o) => !o)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              addOpen ? "bg-foreground text-background" : "bg-foreground/90 text-background hover:bg-foreground"
            )}
            title="Add a saved artifact to the canvas"
          >
            <Plus className="h-4 w-4" />
          </button>
          {addOpen && (
            <div className="absolute left-full top-0 z-50 ml-2 max-h-96 w-72 overflow-y-auto rounded-xl border border-border bg-white py-1.5 shadow-lg">
              <div className="px-4 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Board templates
              </div>
              {FLOW_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { addFlowFromTemplate(t.id); setAddOpen(false); }}
                  className="flex w-full items-start gap-2.5 px-4 py-2 text-left transition-colors hover:bg-accent"
                >
                  <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-foreground">{t.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{t.description}</span>
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => { addCreativeBoard(); setAddOpen(false); }}
                className="flex w-full items-start gap-2.5 px-4 py-2 text-left transition-colors hover:bg-accent"
              >
                <ImageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-foreground">Creative review board</span>
                  <span className="block truncate text-[11px] text-muted-foreground">Live ads vs proposed variants — approve the refresh</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => { addClientReviewBoard(); setAddOpen(false); }}
                className="flex w-full items-start gap-2.5 px-4 py-2 text-left transition-colors hover:bg-accent"
              >
                <Presentation className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-foreground">Client review board</span>
                  <span className="block truncate text-[11px] text-muted-foreground">Assemble narrative + plan, share with the client</span>
                </span>
              </button>
              <div className="mt-1 border-t border-border pt-1.5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Data marketplace
              </div>
              {MARKETPLACE_SEGMENTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { addMarketNode(s.id); setAddOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-accent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-foreground">{s.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{s.provider} · {s.reach}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground">
                    ${s.cpm.toFixed(2)} CPM
                  </span>
                </button>
              ))}
              <div className="mt-1 border-t border-border pt-1.5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Saved artifacts
              </div>
              {unframed.length === 0 ? (
                <p className="px-4 py-2 text-[13px] text-muted-foreground">
                  Everything saved is already on the canvas.
                </p>
              ) : (
                unframed.map((a) => {
                  const Icon = KIND_META[a.kind].icon;
                  return (
                    <button
                      key={`${a.kind}-${a.refId}`}
                      type="button"
                      onClick={() => { addFrame(a.kind, a.refId); setAddOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-accent"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{a.name}</span>
                      <span className="text-[11px] text-muted-foreground">{KIND_META[a.kind].label}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
        <div className="my-0.5 h-px w-5 bg-border" />
        <button
          type="button"
          onClick={() => setConfirmingClear(true)}
          disabled={frames.length === 0 && flows.length === 0 && creatives.length === 0 && boards.length === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          title="Clear the canvas"
        >
          <Eraser className="h-3.5 w-3.5" />
        </button>
        <span
          className="flex h-8 w-8 items-center justify-center text-muted-foreground"
          title="The canvas auto-saves — layout, flows, creatives, and boards survive refresh"
        >
          <Check className="h-3.5 w-3.5 text-emerald-600" />
        </span>
      </div>

      {/* Inspector — click a graph node to see and act on it (Flora-style) */}
      {(() => {
        if (!inspected) return null;
        const shell = (title: React.ReactNode, chip: React.ReactNode, body: React.ReactNode) => (
          <div data-canvas-ui className="absolute right-4 top-4 z-40 w-72 rounded-xl border border-border bg-white shadow-lg">
            <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{title}</span>
              {chip}
              <button
                type="button"
                onClick={() => setInspected(null)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {body}
          </div>
        );
        const metaRow = (label: string, value: React.ReactNode) => (
          <div className="flex items-baseline justify-between gap-3 py-1">
            <span className="text-[11px] text-muted-foreground">{label}</span>
            <span className="text-right text-[12px] font-medium text-foreground">{value}</span>
          </div>
        );

        if (inspected.kind === "audience") {
          const aud = savedAudiences.find((a) => a.id === inspected.audienceId);
          if (!aud) return null;
          // Blast radius: every line, in every plan, that targets this segment.
          const usedBy = savedMediaPlans.flatMap((p) =>
            p.campaigns.filter((l) => audienceForLine(l, savedAudiences)?.id === aud.id).map((l) => `${p.name} — ${l.label}`)
          );
          const feeds = market.filter((m) => m.attachedTo === aud.id).map((m) => marketplaceSegment(m.segmentId)?.name).filter(Boolean);
          return shell(
            aud.name,
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{aud.status}</span>,
            <>
              <div className="px-3.5 py-2">
                {metaRow("Type", aud.type.replace("-", " "))}
                {metaRow("Est. size", aud.estimatedSize)}
                {aud.platforms.length > 0 && metaRow("Platforms", aud.platforms.join(", "))}
                {aud.type === "lookalike" && metaRow("Segment TTL", "expires in 6 days")}
                {feeds.length > 0 && metaRow("Data feeds", feeds.join(", "))}
              </div>
              {usedBy.length > 0 && (
                <div className="border-t border-border px-3.5 py-2">
                  <p className="pb-1 text-[11px] text-muted-foreground">Used by {usedBy.length} {usedBy.length === 1 ? "line" : "lines"} — changes here reach all of them</p>
                  {usedBy.slice(0, 5).map((u) => (
                    <p key={u} className="truncate py-0.5 text-[12px] text-foreground">{u}</p>
                  ))}
                </div>
              )}
              <div className="border-t border-border px-3.5 py-2.5">
                <button
                  type="button"
                  onClick={() => { addFrame("audience", aud.id); setInspected(null); }}
                  className="w-full rounded-lg border border-border py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Open the full audience on the canvas
                </button>
              </div>
            </>
          );
        }

        if (inspected.kind === "market") {
          const node = market.find((m) => m.id === inspected.nodeId);
          const seg = node && marketplaceSegment(node.segmentId);
          if (!node || !seg) return null;
          const attached = node.attachedTo ? savedAudiences.find((a) => a.id === node.attachedTo) : null;
          return shell(
            seg.name,
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground">${seg.cpm.toFixed(2)} CPM</span>,
            <>
              <div className="px-3.5 py-2">
                {metaRow("Provider", seg.provider)}
                {metaRow("Category", seg.category)}
                {metaRow("Reach", seg.reach)}
                {metaRow("Price", `$${seg.cpm.toFixed(2)} CPM on matched impressions`)}
                <p className="pt-1.5 text-[11px] leading-4 text-muted-foreground">{seg.description}</p>
                <p className="pt-1.5 text-[10.5px] text-muted-foreground/70">No cost until attached and the lines using it run.</p>
              </div>
              <div className="border-t border-border px-3.5 py-2.5">
                {attached ? (
                  <button
                    type="button"
                    onClick={() => attachMarketNode(node.id, null)}
                    className="w-full rounded-lg border border-border py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    Detach from {attached.name}
                  </button>
                ) : (
                  <>
                    <p className="pb-1.5 text-[11px] text-muted-foreground">Attach to extend an audience</p>
                    <div className="max-h-36 space-y-1 overflow-y-auto">
                      {savedAudiences.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => attachMarketNode(node.id, a.id)}
                          className="flex w-full items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-left transition-colors hover:bg-accent"
                        >
                          <Users className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">{a.name}</span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">{a.estimatedSize}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          );
        }

        const plan = savedMediaPlans.find((p) => p.id === inspected.planId);
        const line = plan?.campaigns.find((c) => c.id === inspected.lineId);
        if (!plan || !line) return null;
        const planLive = plan.reviewState === "active";
        const lineLive = planLive && line.enabled;
        const cre = CHANNEL_CREATIVE[line.channel] ?? FALLBACK_CREATIVE;
        const stageMeta = { awareness: "Awareness", consideration: "Consideration", conversion: "Conversion" }[line.funnelStage];
        const row = (label: string, value: React.ReactNode) => (
          <div className="flex items-baseline justify-between gap-3 py-1">
            <span className="text-[11px] text-muted-foreground">{label}</span>
            <span className="text-right text-[12px] font-medium text-foreground">{value}</span>
          </div>
        );
        return (
          <div data-canvas-ui className="absolute right-4 top-4 z-40 w-72 rounded-xl border border-border bg-white shadow-lg">
            <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                {inspected.kind === "creative" ? cre.headline : line.label}
              </span>
              {lineLive ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" /> Live
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {line.enabled ? "In plan" : "Off"}
                </span>
              )}
              <button
                type="button"
                onClick={() => setInspected(null)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {inspected.kind === "creative" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cre.imageUrl} alt={cre.headline} className="h-36 w-full bg-muted object-cover" />
            )}
            <div className="px-3.5 py-2">
              {inspected.kind === "creative" && row("Format", cre.format)}
              {row("Plan", plan.name)}
              {row("Stage", stageMeta)}
              {row("Channel", line.channel.toUpperCase())}
              {row("Budget", `$${line.budget.toLocaleString()}`)}
              {line.forecast.impressions > 0 && row("Est. impressions", `${(line.forecast.impressions / 1_000_000).toFixed(1)}M`)}
              {line.forecast.conversions > 0 && row("Est. conversions", line.forecast.conversions.toLocaleString())}
              {line.forecast.roas != null && row("Est. ROAS", `${line.forecast.roas}x`)}
              {line.forecast.cpa != null && row("Est. CPA", `$${line.forecast.cpa}`)}
              {line.flightDates && row("Flight", line.flightDates)}
            </div>
            <div className="flex items-center gap-1.5 border-t border-border px-3.5 py-2.5">
              <button
                type="button"
                onClick={() => {
                  const campaigns = plan.campaigns.map((x) => (x.id === line.id ? { ...x, enabled: !x.enabled } : x));
                  updatePlanFromGraph(recalcMediaPlan({ ...plan, campaigns }), line.enabled ? `${line.label} ${planLive ? "paused" : "excluded"}` : `${line.label} ${planLive ? "is live" : "back in the plan"}`);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
              >
                {line.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {line.enabled ? (planLive ? "Pause" : "Exclude") : (planLive ? "Launch" : "Include")}
              </button>
              <button
                type="button"
                onClick={() => setPendingLineRemoval({ planId: plan.id, ids: [line.id] })}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-red-600"
                title="Remove this line from the plan"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* Empty state */}
      {loaded && frames.length === 0 && flows.length === 0 && creatives.length === 0 && boards.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-sm text-center">
            <Frame className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-[15px] font-medium text-foreground">A blank canvas</p>
            <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
              Ask below to build a campaign, audience, or report — every artifact lands here as a
              movable frame. Or use <span className="font-medium text-foreground">Add</span> to place
              a saved artifact or start an orchestration flow.
            </p>
          </div>
        </div>
      )}

      {/* Interaction hint */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-30 rounded-lg bg-white/80 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
        Drag to pan · ⌘ scroll to zoom · drag cards by their title bar
      </div>
    </div>

    {/* Dialogs live OUTSIDE the pannable container — inside it, the canvas's
        pointer-capture pan would swallow their button clicks. */}
      {/* Delete flow — always behind a confirmation */}
      <ConfirmDialog
        open={deletingFlowId !== null}
        title="Delete this flow?"
        description={`"${flows.find((f) => f.id === deletingFlowId)?.name ?? "Flow"}" and its trigger, condition, and action nodes will be removed. Nothing that already ran is undone.`}
        confirmLabel="Delete flow"
        destructive
        onConfirm={() => {
          setFlows((prev) => prev.filter((f) => f.id !== deletingFlowId));
          setDeletingFlowId(null);
        }}
        onCancel={() => setDeletingFlowId(null)}
      />
      <ConfirmDialog
        open={deletingTileId !== null}
        title="Delete this creative?"
        description={`"${creatives.find((t) => t.id === deletingTileId)?.headline ?? "Creative"}" will be removed from the canvas and the library.`}
        confirmLabel="Delete creative"
        destructive
        onConfirm={() => {
          setCreatives((prev) => prev.filter((t) => t.id !== deletingTileId));
          setDeletingTileId(null);
        }}
        onCancel={() => setDeletingTileId(null)}
      />
      <ConfirmDialog
        open={deletingBoardId !== null}
        title="Remove this review board?"
        description={`"${boards.find((b) => b.id === deletingBoardId)?.name ?? "Review"}" will be removed. The artifacts on the board stay on the canvas, and anything already shared stays shared.`}
        confirmLabel="Remove board"
        destructive
        onConfirm={() => {
          setBoards((prev) => prev.filter((b) => b.id !== deletingBoardId));
          setDeletingBoardId(null);
        }}
        onCancel={() => setDeletingBoardId(null)}
      />
      <ConfirmDialog
        open={pendingLineRemoval !== null}
        title={`Remove ${pendingLineRemoval?.ids.length === 1 ? "this line" : `these ${pendingLineRemoval?.ids.length} lines`}?`}
        description="The lines are deleted from the media plan and the budget and forecast recalculate. This is the same as deleting them in the plan view."
        confirmLabel="Remove lines"
        destructive
        onConfirm={() => {
          if (pendingLineRemoval) {
            const plan = savedMediaPlans.find((p) => p.id === pendingLineRemoval.planId);
            if (plan) {
              const remove = new Set(pendingLineRemoval.ids);
              const campaigns = plan.campaigns.filter((c) => !remove.has(c.id));
              updatePlanFromGraph(recalcMediaPlan({ ...plan, campaigns }), `${remove.size} ${remove.size === 1 ? "line" : "lines"} removed from the plan`);
              setSelectedLines((prev) => {
                const next = new Set(prev);
                remove.forEach((id) => next.delete(id));
                return next;
              });
            }
          }
          setPendingLineRemoval(null);
        }}
        onCancel={() => setPendingLineRemoval(null)}
      />
      <ConfirmDialog
        open={confirmingClear}
        title="Clear the canvas?"
        description="All frames, flows, creative tiles, and review boards will be removed from this canvas. Saved artifacts (campaigns, plans, audiences, reports) are not deleted — you can re-add them from the Add menu. Flows and creatives live only on the canvas and will be deleted."
        confirmLabel="Clear canvas"
        destructive
        onConfirm={clearCanvas}
        onCancel={() => setConfirmingClear(false)}
      />
    </>
  );
}

/* ── A single draggable frame ── */

function FrameShell({
  frame,
  name,
  liveState,
  summary,
  lod,
  expandable,
  onToggleExpand,
  composedBody,
  scale,
  onMove,
  onFocus,
  onRemove,
  onAsk,
  children,
}: {
  frame: CanvasFrame;
  name: string;
  liveState: "active" | "paused" | null;
  summary: string | null;
  lod: boolean;
  expandable: boolean;
  onToggleExpand: (id: string) => void;
  composedBody?: React.ReactNode;
  scale: number;
  onMove: (id: string, x: number, y: number) => void;
  onFocus: (id: string) => void;
  onRemove: (id: string) => void;
  onAsk: (frame: CanvasFrame) => void;
  children: React.ReactNode;
}) {
  const meta = KIND_META[frame.kind];
  const Icon = meta.icon;
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  function onTitlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return; // title-bar buttons don't start a drag
    e.stopPropagation();
    e.preventDefault(); // no text selection while dragging the frame
    onFocus(frame.id);
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: frame.x, oy: frame.y };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
    setDragging(true);
  }

  function onTitlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    onMove(frame.id, drag.ox + (e.clientX - drag.startX) / scale, drag.oy + (e.clientY - drag.startY) / scale);
  }

  function onTitlePointerUp() {
    dragRef.current = null;
    setDragging(false);
  }

  return (
    <div
      data-canvas-frame
      data-frame-id={frame.id}
      className={cn(
        "absolute rounded-2xl border border-border bg-white shadow-[0px_2px_16px_rgba(71,88,114,0.10)]",
        dragging && "shadow-[0px_8px_28px_rgba(71,88,114,0.18)]"
      )}
      style={{ left: frame.x, top: frame.y, width: frame.w, zIndex: frame.z }}
      onPointerDownCapture={() => onFocus(frame.id)}
    >
      <div
        className={cn(
          "flex select-none items-center gap-2 rounded-t-2xl border-b border-border bg-muted/40 px-3 py-2",
          dragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={onTitlePointerUp}
        onPointerCancel={onTitlePointerUp}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {meta.label}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{name}</span>
        {liveState === "active" && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        )}
        {liveState === "paused" && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Paused
          </span>
        )}
        {expandable && (
          <button
            type="button"
            onClick={() => onToggleExpand(frame.id)}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-accent",
              frame.expandedLines ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            title={frame.expandedLines ? "Collapse lines" : "Show lines beside the plan"}
          >
            <ListTree className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onAsk(frame)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Ask the AI about this artifact"
        >
          <Sparkles className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(frame.id)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Remove from canvas (the artifact stays saved)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {composedBody ? (
        /* Decomposed view — the graph beside the frame carries the detail;
           the frame itself becomes the compact plan node with its actions. */
        composedBody
      ) : lod ? (
        /* Low-zoom cover — big type that stays legible when scaled down.
           Zooming past the threshold dissolves it into the real editable card. */
        <div className="p-7">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="h-5 w-5" />
            <span className="text-[13px] font-medium uppercase tracking-wider">{meta.label}</span>
            {liveState === "active" && (
              <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[13px] font-medium text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Live
              </span>
            )}
            {liveState === "paused" && (
              <span className="ml-auto flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[13px] font-medium text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Paused
              </span>
            )}
          </div>
          <p className="mt-4 text-[28px] font-semibold leading-9 text-foreground">{name}</p>
          {summary && <p className="mt-2 text-[17px] leading-7 text-muted-foreground">{summary}</p>}
          <p className="mt-6 text-[13px] text-muted-foreground/60">Zoom in to edit</p>
        </div>
      ) : (
        <div className="cursor-auto p-3">{children}</div>
      )}
    </div>
  );
}
