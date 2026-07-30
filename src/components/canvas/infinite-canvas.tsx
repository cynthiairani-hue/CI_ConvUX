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
  Frame,
  LayoutList,
  Maximize2,
  Megaphone,
  Minus,
  Plus,
  Sparkles,
  Image as ImageIcon,
  Swords,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useCampaign } from "@/contexts/campaign-context";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { cn } from "@/lib/utils";
import { loadCanvas, persistCanvas, loadFlows, persistFlows, loadCreatives, persistCreatives } from "@/lib/storage";
import type { CanvasFrame, CanvasFrameKind, CanvasViewport } from "@/types/canvas";
import type { OrchestrationFlow } from "@/types/orchestration";
import type { AdTile } from "@/types/creative";
import { FLOW_TEMPLATES, createFlowFromTemplate } from "@/data/flow-templates";
import { buildCreativeReviewBoard } from "@/data/creative-templates";
import { FlowWires, FlowNodeCard, NODE_W, NODE_EST_H } from "@/components/canvas/flow-layer";
import { AdTileCard, TILE_W, tileEstHeight } from "@/components/canvas/creative-layer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StrategyCard } from "@/components/patterns/strategy-card";
import { MediaPlanCard } from "@/components/patterns/media-plan-card";
import { AudienceCard } from "@/components/patterns/audience-card";
import { CFONarrativeCard } from "@/components/patterns/cfo-narrative-card";
import { CompetitiveBriefCard } from "@/components/patterns/competitive-brief-card";

const MIN_SCALE = 0.25;
const MAX_SCALE = 1.75;
const GRID_SIZE = 24;

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

export function InfiniteCanvas() {
  const {
    savedStrategies, saveStrategy, activeStrategy, setActiveStrategy,
    savedMediaPlans, saveMediaPlan, activeMediaPlan, setActiveMediaPlan,
    savedAudiences, saveAudience, activeAudience, setActiveAudience,
    savedNarratives, saveNarrative, activeNarrative, setActiveNarrative,
    savedBriefs, saveBrief, activeBrief, setActiveBrief,
    showToast, hydrated,
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

  /* Live viewport ref so frame placement reads the current camera without
     re-creating callbacks on every pan tick. */
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const artifactName = useCallback((kind: CanvasFrameKind, refId: string): string | null => {
    switch (kind) {
      case "strategy": return savedStrategies.find((a) => a.id === refId)?.name ?? null;
      case "media-plan": return savedMediaPlans.find((a) => a.id === refId)?.name ?? null;
      case "audience": return savedAudiences.find((a) => a.id === refId)?.name ?? null;
      case "narrative": return savedNarratives.find((a) => a.id === refId)?.name ?? null;
      case "brief": return savedBriefs.find((a) => a.id === refId)?.name ?? null;
    }
  }, [savedStrategies, savedMediaPlans, savedAudiences, savedNarratives, savedBriefs]);

  /* ── Load / seed / persist ── */

  useEffect(() => {
    if (!hydrated || loaded) return;
    const stored = loadCanvas();
    if (stored) {
      setViewport(stored.viewport);
      // Drop frames whose artifact was deleted since last visit.
      setFrames(stored.frames.filter((f) => artifactName(f.kind, f.refId) !== null));
    } else {
      // First visit: seed the board from the most recent saved artifacts.
      const picks: { kind: CanvasFrameKind; refId: string }[] = [];
      savedStrategies.slice(-2).forEach((s) => picks.push({ kind: "strategy", refId: s.id }));
      savedMediaPlans.slice(-1).forEach((p) => picks.push({ kind: "media-plan", refId: p.id }));
      savedAudiences.slice(-1).forEach((a) => picks.push({ kind: "audience", refId: a.id }));
      savedNarratives.slice(-1).forEach((n) => picks.push({ kind: "narrative", refId: n.id }));
      savedBriefs.slice(-1).forEach((b) => picks.push({ kind: "brief", refId: b.id }));
      // Rough content heights per kind — only used to space the initial layout.
      const EST_HEIGHT: Record<CanvasFrameKind, number> = {
        strategy: 2050, "media-plan": 1250, audience: 1000, narrative: 1300, brief: 1050,
      };
      const colX = [60, 1020];
      const colY = [60, 60];
      setFrames(picks.map((p, i) => {
        const col = i % 2;
        const y = colY[col];
        colY[col] += EST_HEIGHT[p.kind] + 80;
        return { id: frameId(p.kind, p.refId), kind: p.kind, refId: p.refId, x: colX[col], y, w: KIND_META[p.kind].width, z: i + 1 };
      }));
    }
    setLoaded(true);
  }, [hydrated, loaded, artifactName, savedStrategies, savedMediaPlans, savedAudiences, savedNarratives, savedBriefs]);

  useEffect(() => {
    if (loaded) persistCanvas({ viewport, frames });
  }, [viewport, frames, loaded]);

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

  /* ── Frame management ── */

  const addFrame = useCallback((kind: CanvasFrameKind, refId: string) => {
    setFrames((prev) => {
      const maxZ = prev.reduce((m, f) => Math.max(m, f.z), 0);
      const existing = prev.find((f) => f.kind === kind && f.refId === refId);
      if (existing) {
        // Already on the board — just bring it to front.
        return prev.map((f) => (f.id === existing.id ? { ...f, z: maxZ + 1 } : f));
      }
      const el = containerRef.current;
      const cw = el?.clientWidth ?? 1200;
      const ch = el?.clientHeight ?? 800;
      const v = viewportRef.current;
      const w = KIND_META[kind].width;
      // Land near the viewport center, cascading slightly so stacks stay visible.
      const cascade = (prev.length % 5) * 32;
      const x = (cw / 2 - v.x) / v.scale - w / 2 + cascade;
      const y = (ch / 2 - v.y) / v.scale - 220 + cascade;
      return [...prev, { id: frameId(kind, refId), kind, refId, x, y, w, z: maxZ + 1 }];
    });
  }, []);

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

  /* ── Flow management (the orchestration layer) ── */

  const addFlowFromTemplate = useCallback((templateId: string) => {
    const template = FLOW_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const el = containerRef.current;
    const cw = el?.clientWidth ?? 1200;
    const ch = el?.clientHeight ?? 800;
    const v = viewportRef.current;
    const totalW = NODE_W + 380 * 2; // trigger → condition → actions, three columns
    const x = (cw / 2 - v.x) / v.scale - totalW / 2;
    const y = (ch / 2 - v.y) / v.scale - 200;
    setFlows((prev) => [...prev, createFlowFromTemplate(template, { x, y })]);
  }, []);

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

  /* ── Creative tiles (images as exhibits in a decision) ── */

  const addCreativeBoard = useCallback(() => {
    const el = containerRef.current;
    const cw = el?.clientWidth ?? 1200;
    const ch = el?.clientHeight ?? 800;
    const v = viewportRef.current;
    const totalW = TILE_W * 3 + 80;
    const x = (cw / 2 - v.x) / v.scale - totalW / 2;
    const y = (ch / 2 - v.y) / v.scale - 320;
    setCreatives((prev) => [...prev, ...buildCreativeReviewBoard({ x, y })]);
  }, []);

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
    const pad = 60;
    const cw = el.clientWidth, ch = el.clientHeight;
    const scale = Math.min(1, Math.max(MIN_SCALE, Math.min((cw - pad * 2) / (maxX - minX), (ch - pad * 2) / (maxY - minY))));
    setViewport({
      scale,
      x: (cw - (maxX - minX) * scale) / 2 - minX * scale,
      y: (ch - (maxY - minY) * scale) / 2 - minY * scale,
    });
  }, [frames, flows, creatives]);

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
      <div data-canvas-ui className="absolute left-4 top-4 z-40 flex items-center gap-0.5 rounded-xl border border-border bg-white p-1 shadow-sm">
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
        <div className="mx-1 h-5 w-px bg-border" />
        <button
          type="button"
          onClick={fitToContent}
          disabled={frames.length === 0}
          className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          title="Fit all frames in view"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Fit
        </button>
        <div className="mx-1 h-5 w-px bg-border" />
        <div className="relative">
          <button
            type="button"
            onClick={() => setAddOpen((o) => !o)}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Add a saved artifact to the canvas"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
          {addOpen && (
            <div className="absolute left-0 top-full z-50 mt-1.5 max-h-96 w-72 overflow-y-auto rounded-xl border border-border bg-white py-1.5 shadow-lg">
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
      </div>

      {/* Empty state */}
      {loaded && frames.length === 0 && flows.length === 0 && creatives.length === 0 && (
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

      {/* Interaction hint */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-30 rounded-lg bg-white/80 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
        Drag to pan · ⌘ scroll to zoom · drag cards by their title bar
      </div>
    </div>
  );
}

/* ── A single draggable frame ── */

function FrameShell({
  frame,
  name,
  scale,
  onMove,
  onFocus,
  onRemove,
  onAsk,
  children,
}: {
  frame: CanvasFrame;
  name: string;
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
      <div className="cursor-auto p-3">{children}</div>
    </div>
  );
}
