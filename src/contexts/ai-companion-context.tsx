"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePersona } from "./persona-context";
import { getWelcomeMessage } from "@/data/ai-responses";
import {
  parseIntent,
  mergeIntent,
  getNextChoiceTool,
  resolveChoice,
  getAcknowledgment,
  buildPlanFromIntent,
  getNextStrategyTool,
  buildStrategyFromIntent,
  type CampaignIntent,
  type StrategyIntent,
  type StrategyFlowTool,
} from "@/data/campaign-flow";
import type { CampaignPlan, StrategyPlan, KeywordChip, IABIndustry, IABRestrictedCategory, ChatMode, DetailLevel, AudienceSegment, AudienceSegmentType, MediaPlan, MediaChannelKey } from "@/types/campaign";
import type { ChoiceOption } from "@/components/ai-companion/chat-choices";
import { useCampaign } from "./campaign-context";
import { useLayout } from "./layout-context";
import { buildNarrativeFromSeed } from "@/data/narrative-flow";
import { SEED_PERFORMANCE, SEED_ANOMALIES } from "@/data/seed-company";
import { FFERN_SEED_PERFORMANCE, FFERN_SEED_ANOMALIES } from "@/data/seed-ffern";
import { getCurrentBrand, mapBrandIndustryToIAB, type BrandProfile } from "@/data/brand-profiles";
import {
  loadChatSessions,
  loadChatSessionMetas,
  saveChatSession,
  deleteChatSession as deleteSessionFromStorage,
  archiveChatSession as archiveSessionInStorage,
  renameChatSession as renameSessionInStorage,
  persistChatSessions,
  autoNameSession,
  inferSessionGroup,
  type StoredChatSession,
  type ChatSessionMeta,
} from "@/lib/storage";
import { SEED_CHAT_SESSIONS } from "@/data/seed-chats";
import { ensureReturningSeed } from "@/data/seed-returning";
import { buildCompetitiveBrief } from "@/data/competitive-flow";
import { buildOperatorPlan } from "@/data/operator-flow";
import { buildMediaPlan, editCampaignBudget, toggleCampaign, setTotalBudget, parseMediaPlanCommand, WHY_CHANNEL, getPlanInflight } from "@/data/media-plan-flow";
import { getActiveClient } from "@/data/seed-agency";
import { getClientDataSummary } from "@/data/client-data";

export type AICompanionState = "resting" | "fullscreen" | "split" | "floating";
export type DockSide = "right" | "left";

/**
 * The layout the chat opens in when launched from an "outside" input bar
 * (any page input or CTA). Defaults to fullscreen and is ONLY changed by an
 * explicit user choice in the ChatLayoutPicker — never by automatic system
 * splits (e.g. auto-split on artifact). This keeps "type in the bar → fullscreen"
 * the default everywhere unless the user deliberately changes it.
 */
export const ENTRY_LAYOUT_KEY = "fuseiq-entry-layout";
function readEntryLayout(): AICompanionState {
  // The chat opens in the layout the user explicitly chose in the ChatLayoutPicker
  // (persisted to ENTRY_LAYOUT_KEY); fullscreen for anyone who hasn't picked.
  // Automatic transitions never write this key, so a deliberate choice (e.g.
  // "always float") actually sticks across launches instead of being a dead setting.
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(ENTRY_LAYOUT_KEY);
    if (saved === "fullscreen" || saved === "split" || saved === "floating") return saved;
  }
  return "fullscreen";
}

/**
 * The layout an artifact opens into when a build completes. Honors an explicit
 * "floating" preference; otherwise auto-splits (the documented default). This
 * keeps every build path consistent with the bubble / minimize / auto-open,
 * which all honor floating — so a floating-preference user is never yanked into
 * split mid-flow.
 */
function autoArtifactLayout(): AICompanionState {
  if (typeof window !== "undefined" && localStorage.getItem(ENTRY_LAYOUT_KEY) === "floating") {
    return "floating";
  }
  return "split";
}

export interface ToolCallChoices {
  type: "choices";
  field: string;
  question: string;
  subtitle?: string;
  step: number;
  totalSteps: number;
  options: ChoiceOption[];
  multiSelect?: boolean;
}

export interface ToolCallAdvertiserSetup {
  type: "advertiser-setup";
  field: "advertiserSetup";
  question: string;
  step: number;
  totalSteps: number;
}

export interface ToolCallKeywords {
  type: "keywords";
  field: "selectedKeywords";
  question: string;
  step: number;
  totalSteps: number;
  keywords: KeywordChip[];
}

export interface ToolCallPlatformConnect {
  type: "platform-connect";
  field: string;
  platformIds: string[];
  /** The original intent: "performance" | "connect" | "budget" */
  intentTag: string;
}

export type ToolCall = ToolCallChoices | ToolCallAdvertiserSetup | ToolCallKeywords | ToolCallPlatformConnect;

export interface PerformanceSnapshot {
  title: string;
  period: string;
  metrics: {
    label: string;
    value: string;
    change?: { direction: "up" | "down" | "flat"; text: string };
    context?: string;
  }[];
}

export interface AttachedImage {
  name: string;
  type: string;
  size: number;
  /** Base64 data URL */
  dataUrl: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  artifact?: CampaignPlan | StrategyPlan;
  performanceSnapshot?: PerformanceSnapshot;
  toolCall?: ToolCall;
  /** Images attached by the user */
  images?: AttachedImage[];
  /** Thinking steps shown before the response — collapsible */
  thinkingSteps?: string[];
  /** Estimated token count for this message */
  tokenCount?: number;
  /** True while the reply is streaming in (renders a typing caret). */
  streaming?: boolean;
  /** Streamed extended-thinking trace (Thinking detail mode) — collapsible. */
  reasoning?: string;
}

/** A canvas element selected for contextual edit (Figma-Make-style select mode). */
export interface ChatContextRef {
  label: string;  // chip label, e.g. "Line 1 · Connected TV (CTV)"
  detail: string; // fuller context handed to the LLM
}

interface AICompanionContextValue {
  state: AICompanionState;
  setState: (state: AICompanionState) => void;
  /** Persist the user's explicit default layout for opening chat from an input bar. */
  setEntryLayout: (layout: AICompanionState) => void;
  dockSide: DockSide;
  chatMode: ChatMode;
  setChatMode: (mode: ChatMode) => void;
  detailLevel: DetailLevel;
  setDetailLevel: (level: DetailLevel) => void;
  messages: ChatMessage[];
  isLoading: boolean;
  openFullscreen: (initialMessage?: string, opts?: { skipIntentRouting?: boolean }) => void;
  startCampaignFlow: () => void;
  startMediaPlanFlow: () => void;
  /** Open a plan with a contextual chat starter (status + in-flight suggestion). */
  openPlanContext: (plan: MediaPlan) => void;
  minimize: () => void;
  close: () => void;
  expand: () => void;
  /** Reopen the chat from the bubble while keeping the on-canvas artifact visible. */
  reopenChat: () => void;
  setDockSide: (side: DockSide) => void;
  toggleDockSide: () => void;
  sendMessage: (content: string, files?: { name: string; type: string; size: number; preview?: string }[], options?: { skipIntentRouting?: boolean }) => void;
  submitChoice: (messageId: string, field: string, selected: string[]) => void;
  skipChoice: (messageId: string, field: string) => void;
  submitAdvertiserSetup: (messageId: string, data: {
    companyName: string;
    websiteUrl: string;
    industry: IABIndustry;
    restrictedCategories: IABRestrictedCategory[];
  }) => void;
  submitKeywords: (messageId: string, selectedKeywordIds: string[], allKeywords: KeywordChip[]) => void;
  submitPlatformConnection: (messageId: string, connectedIds: string[], intentTag: string) => void;
  /** Contextual edit (select mode): the element attached to the chat input. */
  pendingContext: ChatContextRef | null;
  setPendingContext: (ctx: ChatContextRef | null) => void;
  /** When true, the canvas highlights selectable containers to attach to chat. */
  selectMode: boolean;
  setSelectMode: (on: boolean) => void;
  /** Chat session management */
  currentSessionId: string | null;
  chatSessions: ChatSessionMeta[];
  startNewChat: () => void;
  loadChatSession: (sessionId: string) => void;
  renameChatSession: (sessionId: string, name: string) => void;
  archiveChatSession: (sessionId: string) => void;
  deleteChatSession: (sessionId: string) => void;
}

const AICompanionContext = createContext<AICompanionContextValue | null>(null);

let messageId = 0;
function nextId() {
  return `msg-${++messageId}`;
}

/** A ready-to-send sample brief so the demo never depends on typing a full brief. */
function sampleBriefFor(clientName: string): string {
  return `Build a 90-day media plan for ${clientName}'s Summer '26 launch. Budget is $90,000. Goal: drive 3,000 new customers at a 4× ROAS. Audience is 18–34 streetwear and skate fans in the US. Leaning into paid social and display, open to upper-funnel. Flight: June–August.`;
}

/** Choice card offering the one-click sample brief. */
function sampleBriefCard(): ChatMessage {
  return {
    id: nextId(),
    role: "assistant",
    content: "",
    toolCall: {
      type: "choices",
      field: "media-plan-sample",
      question: "Or use a sample brief",
      step: 1,
      totalSteps: 1,
      multiSelect: false,
      options: [{ id: "sample", label: "Use a sample — Summer '26 launch · $90K · 3,000 customers · 4× ROAS" }],
    },
  };
}

/** A pasted/typed message is a usable brief if it has real detail (budget/goal/length). */
function looksLikeBriefText(text: string): boolean {
  return text.trim().length > 60 || /\$\s?\d|\bbudget\b|\broas\b|\bgoal\b|\d{3,}/i.test(text);
}

export function AICompanionProvider({ children }: { children: ReactNode }) {
  const { activePersona } = usePersona();
  const { setActivePlan, advertiser, setAdvertiser, setActiveStrategy, saveStrategy, saveNarrative, setActiveNarrative, setActiveAudience, setActiveBrief, saveBrief, setActiveOperator, setActiveMediaPlan, saveMediaPlan, activeMediaPlan, savedMediaPlans, clearAllArtifacts } = useCampaign();
  const { collapseLeftRail } = useLayout();
  // Defer localStorage reads to useEffect to prevent hydration mismatches
  // Always boots to "resting" — the chat opens deliberately (a CTA, the bubble,
  // or typing in an input bar), never auto-opened on load. (A prior "restore
  // docked layout on mount" effect was dead code: the persona-mount effect below
  // unconditionally resets to resting, so it never took effect.)
  const [state, setStateRaw] = useState<AICompanionState>("resting");
  const setState = useCallback((s: AICompanionState) => {
    // Runtime state ONLY. The user's preferred layout lives in ENTRY_LAYOUT_KEY,
    // written exclusively by setEntryLayout (the ChatLayoutPicker). Automatic
    // transitions — auto-split on a build, the bubble, minimize, navigation —
    // must never overwrite that deliberate choice, so setState persists nothing.
    setStateRaw(s);
  }, []);
  // Remember the last VISIBLE layout so the bubble restores the chat to exactly
  // how it was before it was minimized — not a generic floating default.
  const lastVisibleLayoutRef = useRef<AICompanionState>("split");
  useEffect(() => {
    if (state !== "resting") lastVisibleLayoutRef.current = state;
  }, [state]);
  // Explicit default layout for launching chat from an input bar. Only the
  // ChatLayoutPicker calls this — automatic splits never touch it.
  const setEntryLayout = useCallback((layout: AICompanionState) => {
    if (
      typeof window !== "undefined" &&
      (layout === "fullscreen" || layout === "split" || layout === "floating")
    ) {
      localStorage.setItem(ENTRY_LAYOUT_KEY, layout);
    }
  }, []);
  const [dockSide, setDockSideRaw] = useState<DockSide>("left");
  useEffect(() => {
    const saved = (localStorage.getItem("fuseiq-dock-side") as DockSide) || "left";
    setDockSideRaw(saved);
  }, []);
  const setDockSide = useCallback((side: DockSide) => {
    setDockSideRaw(side);
    if (typeof window !== "undefined") {
      localStorage.setItem("fuseiq-dock-side", side);
    }
  }, []);
  const [chatMode, setChatModeState] = useState<ChatMode>("plan");
  useEffect(() => {
    const raw = localStorage.getItem("fuseiq-chat-mode");
    // Migrate legacy values from the 2-mode era
    const migrated =
      raw === "assisted" ? "express" : raw === "conversational" ? "plan" : raw;
    const valid: ChatMode[] = ["express", "plan", "advise", "research"];
    const saved = valid.includes(migrated as ChatMode) ? (migrated as ChatMode) : "plan";
    setChatModeState(saved);
    if (migrated !== raw) localStorage.setItem("fuseiq-chat-mode", saved);
  }, []);

  const setChatMode = useCallback((mode: ChatMode) => {
    setChatModeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("fuseiq-chat-mode", mode);
    }
  }, []);
  const [detailLevel, setDetailLevelState] = useState<DetailLevel>("normal");
  useEffect(() => {
    const saved = (localStorage.getItem("fuseiq-detail-level") as DetailLevel) || "normal";
    setDetailLevelState(saved);
  }, []);
  const setDetailLevel = useCallback((level: DetailLevel) => {
    setDetailLevelState(level);
    if (typeof window !== "undefined") {
      localStorage.setItem("fuseiq-detail-level", level);
    }
  }, []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingContext, setPendingContext] = useState<ChatContextRef | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [campaignIntent, setCampaignIntent] = useState<CampaignIntent | null>(null);
  const [strategyIntent, setStrategyIntent] = useState<StrategyIntent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  // --- Chat session state ---
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSessionMeta[]>(() => {
    if (typeof window === "undefined") return [];
    // Populate the returning-user workspace (idempotent) before reading sessions,
    // so a returning user lands with past chats / campaigns / reports already there.
    ensureReturningSeed();
    return loadChatSessionMetas();
  });

  // Seed chat sessions for returning users who have no prior sessions
  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = loadChatSessionMetas();
    if (existing.length > 0) return;
    // Check if this is a returning user (has saved strategies)
    try {
      const strats = localStorage.getItem("fuseiq-strategies");
      if (!strats || JSON.parse(strats).length === 0) return;
    } catch { return; }
    // Seed the sessions
    persistChatSessions(SEED_CHAT_SESSIONS);
    setChatSessions(SEED_CHAT_SESSIONS.map(s => ({
      id: s.id, name: s.name, status: s.status, group: s.group,
      createdAt: s.createdAt, lastMessageAt: s.lastMessageAt, messageCount: s.messageCount,
    })));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initNewSession = useCallback((skipWelcome?: boolean) => {
    const sessionId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setCurrentSessionId(sessionId);
    if (skipWelcome) {
      setMessages([]);
    } else {
      setMessages([
        {
          id: nextId(),
          role: "assistant",
          content: getWelcomeMessage(activePersona.id, getCurrentBrand()?.name),
        },
      ]);
    }
    setCampaignIntent(null);
    setStrategyIntent(null);
    setActiveStrategy(null);
    setActiveNarrative(null);
    setActiveAudience(null);
    setActiveBrief(null);
    setActiveOperator(null);
    setActiveMediaPlan(null);
    return sessionId;
  }, [activePersona.id, setActiveStrategy, setActiveNarrative, setActiveAudience, setActiveBrief, setActiveOperator, setActiveMediaPlan]);

  useEffect(() => {
    initNewSession();
    setState("resting");
  }, [activePersona.id, initNewSession]);

  // --- Strategy flow logic ---
  const evaluateStrategyFlow = useCallback(
    (intent: StrategyIntent, userMsg?: ChatMessage) => {
      const nextTool = getNextStrategyTool(intent, !!advertiser);

      if (nextTool) {
        const aiMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: "",
          toolCall: strategyToolToToolCall(nextTool),
        };
        setMessages((prev) => [...(userMsg ? [...prev, userMsg] : prev), aiMsg]);
        setStrategyIntent(intent);
      } else {
        // Build the strategy card — with progressive thinking experience
        const adv = advertiser || {
          id: `adv-${Date.now()}`,
          companyName: intent.advertiserSetup?.companyName || "Company",
          websiteUrl: intent.advertiserSetup?.websiteUrl || "example.com",
          industry: intent.advertiserSetup?.industry || "other",
          restrictedCategories: intent.advertiserSetup?.restrictedCategories || [],
        };

        if (!advertiser) {
          setAdvertiser(adv);
        }

        // Add user message immediately
        if (userMsg) {
          setMessages((prev) => [...prev, userMsg]);
        }

        setIsLoading(true);
        setStrategyIntent(null);

        // Progressive thinking steps — context-aware based on objective
        const brand = brandRef.current;
        const objLabel = intent.objective || "campaign";
        const advName = adv.companyName;
        const isCTV = objLabel === "awareness";
        const thinkingSteps = isCTV ? [
          `Analyzing brief — awareness campaign for ${advName}`,
          `Sourcing premium CTV/OTT inventory — streaming apps, smart TVs, set-top boxes`,
          `Building audience segments for ${brand ? brand.industry.toLowerCase() : "your industry"} viewers`,
          "Allocating budget across CTV, video, and display placements",
          "Forecasting household reach, completed views, and frequency",
          "Assembling your media plan",
        ] : [
          `Analyzing brief — ${objLabel} campaign for ${advName}`,
          `Setting ${({ traffic: "traffic", sales: "conversion", leads: "lead-gen", retargeting: "retargeting", "app-promotion": "app-install" } as Record<string, string>)[intent.objective || ""] || "awareness"} targeting based on ${brand ? brand.industry.toLowerCase() : "your industry"}`,
          "Allocating budget across recommended placements",
          "Calculating audience reach and frequency estimates",
          "Building forecast with confidence scores",
          "Assembling your media plan",
        ];

        const stepDelay = 600;
        const thinkingId = nextId();
        const thinkingMsg: ChatMessage = {
          id: thinkingId,
          role: "assistant",
          content: "",
          thinkingSteps: [],
        };
        setMessages((prev) => [...prev, thinkingMsg]);

        // Show thinking steps progressively
        thinkingSteps.forEach((step, i) => {
          setTimeout(() => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === thinkingId
                  ? { ...m, thinkingSteps: thinkingSteps.slice(0, i + 1) }
                  : m
              )
            );
          }, (i + 1) * stepDelay);
        });

        // After all thinking steps, deliver the strategy
        setTimeout(() => {
          const strategy = buildStrategyFromIntent(intent, adv);
          // Attach selected keywords to the strategy — resolve IDs to real labels
          const kwLookup = new Map(
            (intent.allKeywords || []).map((k) => [k.id, k])
          );
          strategy.keywords = (intent.selectedKeywords || []).map((id) => {
            const chip = kwLookup.get(id);
            return {
              id,
              label: chip?.label || id,
              category: chip?.category || ("interest" as const),
              selected: true,
            };
          });

          setActiveStrategy(strategy);
          saveStrategy(strategy);

          // Replace the thinking message with final response
          setMessages((prev) =>
            prev.map((m) =>
              m.id === thinkingId
                ? {
                    ...m,
                    content: `Your ${objLabel} strategy for ${advName} is on the canvas — review each section, edit anything, then save or send for approval when ready.`,
                  }
                : m
            )
          );

          setIsLoading(false);
          // Auto-split: chat moves to left panel, canvas shows the strategy
          setState(autoArtifactLayout());
          collapseLeftRail();
        }, thinkingSteps.length * stepDelay + 600);
      }
    },
    [advertiser, setAdvertiser, setActiveStrategy, saveStrategy, collapseLeftRail]
  );

  // --- Legacy campaign flow logic ---
  const evaluateAndRespond = useCallback(
    (intent: CampaignIntent, userMsg?: ChatMessage) => {
      const nextTool = getNextChoiceTool(intent);

      if (nextTool) {
        const aiMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: "",
          toolCall: {
            type: "choices",
            field: nextTool.field,
            question: nextTool.question,
            subtitle: nextTool.subtitle,
            step: nextTool.step,
            totalSteps: nextTool.totalSteps,
            options: nextTool.options,
          },
        };
        setMessages((prev) => [...(userMsg ? [...prev, userMsg] : prev), aiMsg]);
        setCampaignIntent(intent);
      } else {
        const plan = buildPlanFromIntent(intent);
        setActivePlan(plan);
        const ackMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: getAcknowledgment(intent),
        };
        const planMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content:
            "Here's your media plan. Each section shows its readiness state — review the details, edit anything, and send for approval when ready.",
          artifact: plan,
        };
        setMessages((prev) => [
          ...(userMsg ? [...prev, userMsg] : prev),
          ackMsg,
          planMsg,
        ]);
        setCampaignIntent(null);
      }
    },
    [setActivePlan]
  );

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // --- Auto-persist current session to localStorage ---
  useEffect(() => {
    if (!currentSessionId || messages.length <= 1) return;
    // Find the first user message for auto-naming
    const firstUserMsg = messages.find((m) => m.role === "user");
    if (!firstUserMsg) return;

    const now = new Date().toISOString();
    const existing = loadChatSessions().find((s) => s.id === currentSessionId);

    const session: StoredChatSession = {
      id: currentSessionId,
      name: existing?.name || autoNameSession(firstUserMsg.content),
      status: existing?.status || "active",
      group: existing?.group || inferSessionGroup(firstUserMsg.content),
      createdAt: existing?.createdAt || now,
      lastMessageAt: now,
      messageCount: messages.filter((m) => m.role === "user").length,
      messages: messages
        .filter((m) => m.content && !m.toolCall)
        .map((m) => ({ role: m.role, content: m.content })),
    };

    saveChatSession(session);
    // Update local meta list
    setChatSessions(loadChatSessionMetas());
  }, [messages, currentSessionId]);

  // Ref mirrors for values accessed inside setTimeout closures
  const strategyIntentRef = useRef<StrategyIntent | null>(null);
  useEffect(() => {
    strategyIntentRef.current = strategyIntent;
  }, [strategyIntent]);

  const campaignIntentRef = useRef<CampaignIntent | null>(null);
  useEffect(() => {
    campaignIntentRef.current = campaignIntent;
  }, [campaignIntent]);

  // Brand context for API calls — initialize eagerly so it's available on first interaction
  const brandRef = useRef<BrandProfile | null>(
    typeof window !== "undefined" ? getCurrentBrand() : null
  );
  // Also refresh after mount in case localStorage wasn't ready during SSR hydration
  useEffect(() => {
    brandRef.current = getCurrentBrand();
  }, []);

  // Ref for detailLevel so callAPI closure always has current value
  const detailLevelRef = useRef<DetailLevel>(detailLevel);
  useEffect(() => {
    detailLevelRef.current = detailLevel;
  }, [detailLevel]);

  // Ref for chatMode so callAPI closure always has current value
  const chatModeRef = useRef<ChatMode>(chatMode);
  useEffect(() => {
    chatModeRef.current = chatMode;
  }, [chatMode]);

  // Track the live session id so async builds can stamp the plan with the chat
  // that created it (used to restore the conversation when the plan is reopened).
  const currentSessionIdRef = useRef<string | null>(currentSessionId);
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  // Media-plan flow: track when we're awaiting a pasted brief, and keep a live
  // ref to the active plan so refine actions (shift/why/activate) read fresh state.
  const mediaPlanFlowRef = useRef<{ stage: "idle" | "awaiting-brief"; brief: string }>({ stage: "idle", brief: "" });
  const activeMediaPlanRef = useRef<MediaPlan | null>(null);
  // Last channel the user edited via chat — lets pronouns ("change it to…") resolve.
  const lastEditedChannelRef = useRef<MediaChannelKey | null>(null);
  useEffect(() => {
    activeMediaPlanRef.current = activeMediaPlan;
  }, [activeMediaPlan]);

  // Shared payload builder — message mapping + brand context — used by both the
  // whole-response (callAPI) and streaming (callAPIStreaming) transports.
  const buildChatPayload = useCallback((allMessages: ChatMessage[]) => {
      const apiMessages = allMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .filter((m) => m.content || m.performanceSnapshot || m.images?.length)
        .map((m) => {
          // Build text content — include performance snapshot as text so the API can reference it
          let text = m.content || "";
          if (m.performanceSnapshot) {
            const snap = m.performanceSnapshot;
            const metricsText = snap.metrics
              .map((metric) => `- ${metric.label}: ${metric.value}${metric.change ? ` (${metric.change.direction === "up" ? "↑" : "↓"}${metric.change.text})` : ""}${metric.context ? ` — ${metric.context}` : ""}`)
              .join("\n");
            text = text
              ? `${text}\n\n[${snap.title} — ${snap.period}]\n${metricsText}`
              : `[${snap.title} — ${snap.period}]\n${metricsText}`;
          }

          // If user attached images, send as multimodal content blocks
          if (m.images?.length && m.role === "user") {
            const contentBlocks: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [];
            for (const img of m.images) {
              // Extract base64 data from data URL
              const base64Match = img.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
              if (base64Match) {
                contentBlocks.push({
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: base64Match[1],
                    data: base64Match[2],
                  },
                });
              }
            }
            if (text) {
              contentBlocks.push({ type: "text", text });
            }
            return { role: m.role, content: contentBlocks };
          }

          return { role: m.role, content: text };
        });

      const brand = brandRef.current;
      const activeClientId = getActiveClient()?.id;
      const dataSummary = activeClientId ? getClientDataSummary(activeClientId) : null;
      const brandContext = brand
        ? {
            name: brand.name,
            domain: brand.domain,
            industry: brand.industry,
            tagline: brand.tagline,
            additionalContext: dataSummary || undefined,
          }
        : undefined;

      return { apiMessages, brandContext };
  }, []);

  const FALLBACK_REPLY = "I can't process that right now. Try asking about performance, campaigns, budgets, or optimization — those work best.";

  const callAPI = useCallback(
    async (allMessages: ChatMessage[]) => {
      const { apiMessages, brandContext } = buildChatPayload(allMessages);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, brandContext, detailLevel: detailLevelRef.current, chatMode: chatModeRef.current }),
        });
        if (!res.ok) return { text: FALLBACK_REPLY, toolCall: null };
        return await res.json();
      } catch {
        return { text: FALLBACK_REPLY, toolCall: null };
      }
    },
    [buildChatPayload]
  );

  // Real SSE token streaming for the main chat reply. Fires onText/onReasoning
  // as deltas arrive; falls back to the whole-response callAPI on any failure.
  const callAPIStreaming = useCallback(
    async (
      allMessages: ChatMessage[],
      handlers: { onText?: (delta: string) => void; onReasoning?: (delta: string) => void }
    ): Promise<{ text: string; toolCall: { name: string; input: Record<string, unknown> } | null; reasoning: string; followups?: string[] }> => {
      const { apiMessages, brandContext } = buildChatPayload(allMessages);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, brandContext, detailLevel: detailLevelRef.current, chatMode: chatModeRef.current, stream: true }),
        });
        if (!res.ok || !res.body) {
          const whole = await callAPI(allMessages);
          if (whole.text) handlers.onText?.(whole.text);
          return { text: whole.text, toolCall: whole.toolCall, reasoning: "" };
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let reasoning = "";
        let toolCall: { name: string; input: Record<string, unknown> } | null = null;

        // The reply ends with a machine-readable "FOLLOWUPS: a | b | c" line we
        // must never show. Buffer the raw text, only emit the part before the
        // marker, and hold back a short tail so a half-arrived marker never flashes.
        const MARK = /FOLLOWUPS:/i;
        const HOLD = 12;
        let raw = "";
        let emitted = 0;
        const flush = (final: boolean) => {
          const mi = raw.search(MARK);
          const visibleEnd = mi >= 0 ? mi : final ? raw.length : Math.max(0, raw.length - HOLD);
          if (visibleEnd > emitted) {
            handlers.onText?.(raw.slice(emitted, visibleEnd));
            emitted = visibleEnd;
          }
        };

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            try {
              const evt = JSON.parse(payload) as { type: string; delta?: string; toolCall?: { name: string; input: Record<string, unknown> } | null };
              if (evt.type === "text" && evt.delta) { raw += evt.delta; flush(false); }
              else if (evt.type === "reasoning" && evt.delta) { reasoning += evt.delta; handlers.onReasoning?.(evt.delta); }
              else if (evt.type === "done") { toolCall = evt.toolCall ?? null; }
            } catch { /* skip malformed chunk */ }
          }
        }
        flush(true);

        const mi = raw.search(MARK);
        const text = (mi >= 0 ? raw.slice(0, mi) : raw).replace(/\s+$/, "");
        let followups: string[] | undefined;
        if (mi >= 0) {
          const parsed = raw.slice(mi).replace(/^[\s\S]*?FOLLOWUPS:/i, "").split("\n")[0]
            .split("|").map((s) => s.trim()).filter(Boolean).slice(0, 3);
          if (parsed.length) followups = parsed;
        }

        // Nothing came through (stream errored mid-flight) → whole-response fallback.
        if (!text && !toolCall) {
          const whole = await callAPI(allMessages);
          if (whole.text) handlers.onText?.(whole.text);
          return { text: whole.text, toolCall: whole.toolCall, reasoning };
        }
        return { text, toolCall, reasoning, followups };
      } catch {
        const whole = await callAPI(allMessages);
        if (whole.text) handlers.onText?.(whole.text);
        return { text: whole.text, toolCall: whole.toolCall, reasoning: "" };
      }
    },
    [buildChatPayload, callAPI]
  );

  const sendMessage = useCallback(
    (content: string, files?: { name: string; type: string; size: number; preview?: string }[], options?: { skipIntentRouting?: boolean }) => {
      // Convert AttachedFile previews (data URLs) to AttachedImage for persistence & API
      const images: AttachedImage[] | undefined = files
        ?.filter((f) => f.preview && f.type.startsWith("image/"))
        .map((f) => ({
          name: f.name,
          type: f.type,
          size: f.size,
          dataUrl: f.preview!,
        }));

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content,
        ...(images && images.length > 0 ? { images } : {}),
      };

      // Ensure brand context is fresh — ref may not have been set if useEffect hasn't fired
      if (!brandRef.current) brandRef.current = getCurrentBrand();

      // Next-step prompt after a conversational answer — rendered with the
      // EXISTING ChatChoices card (radio single-select), not a bespoke chip.
      // Every option MUST route to a flow that actually works (verified:
      // analytical questions → grounded LLM answer; competitor ask → brief
      // artifact). Never offer an action the system can't perform. Returns the
      // answer message plus an optional choices card to append after it.
      const answerWithNextSteps = (text: string, userContent: string, followups?: string[]): ChatMessage[] => {
        const aiMsg: ChatMessage = { id: nextId(), role: "assistant", content: text };
        let options: ChoiceOption[];
        if (followups && followups.length > 0) {
          // Contextual follow-ups the model generated from THIS answer.
          options = followups.slice(0, 3).map((q, i) => ({ id: `fu-${i}`, label: q }));
        } else if (!brandRef.current && !getActiveClient()) {
          // COLD START (no brand/client yet) — the user the principles target most.
          // Offer real first steps instead of a dead-end paragraph; each label
          // routes to a working flow via sendMessage (connect / campaign / budget).
          options = [
            { id: "cs-connect", label: "Connect my ad accounts" },
            { id: "cs-campaign", label: "Build a campaign" },
            { id: "cs-budget", label: "Plan my monthly budget" },
          ];
        } else {
          // Fallback: a generic pool (only when the model didn't emit follow-ups).
          const pool: ChoiceOption[] = [
            { id: "shift-budget", label: "Where should I shift budget to improve ROAS?" },
            { id: "trend", label: "Break down my monthly performance trend" },
            { id: "competitors", label: "See where competitors are winning" },
          ];
          const u = userContent.trim().toLowerCase();
          options = pool.filter((o) => o.label.toLowerCase() !== u).slice(0, 3);
        }
        if (options.length === 0) return [aiMsg];
        const card: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: "",
          toolCall: {
            type: "choices",
            field: "next-step",
            question: "What would you like to do next?",
            step: 1,
            totalSteps: 1,
            multiSelect: false,
            options,
          },
        };
        return [aiMsg, card];
      };

      // Stream the conversational reply into a placeholder bubble (typing caret +
      // optional Thinking trace), then append the next-step menu once complete.
      const streamReply = (updatedMessages: ChatMessage[], userContent: string) => {
        const replyId = nextId();
        setMessages((prev) => [...prev, { id: replyId, role: "assistant", content: "", streaming: true }]);
        setIsLoading(false);
        callAPIStreaming(updatedMessages, {
          onText: (delta) => setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, content: m.content + delta } : m))),
          onReasoning: (delta) => setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, reasoning: (m.reasoning || "") + delta } : m))),
        }).then((res) => {
          setMessages((prev) => {
            const finalized = prev.map((m) => (m.id === replyId ? { ...m, content: res.text || m.content, streaming: false } : m));
            const extras = answerWithNextSteps(res.text, userContent, res.followups).slice(1); // menu card only — reply is already streamed
            return [...finalized, ...extras];
          });
        });
      };

      // LLM-driven media-plan build from a brief: Claude READS the brief and
      // extracts the interpretation (objective, budget, goal, assumptions, and
      // whether anything's genuinely missing) — so it never asks a question the
      // brief already answered. The plan MATH stays anchored to the client's real
      // data (deterministic, demo-safe). Falls back to safe defaults if the LLM
      // call fails, so the build never breaks.
      const doBriefBuild = async (briefText: string) => {
        const b = brandRef.current || getCurrentBrand();
        const adv = b
          ? {
              id: `adv-${b.domain.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
              companyName: b.name,
              websiteUrl: b.domain,
              industry: mapBrandIndustryToIAB(b.industry),
              restrictedCategories: [],
            }
          : { id: "adv-fallback", companyName: "Your client", websiteUrl: "your-site.com", industry: mapBrandIndustryToIAB("other"), restrictedCategories: [] };
        const clientName = adv.companyName;

        const thinkingMsg: ChatMessage = { id: nextId(), role: "assistant", content: "", thinkingSteps: [] };
        const thinkingId = thinkingMsg.id;
        setMessages((prev) => [...prev, thinkingMsg]);
        setIsLoading(false);
        const addStep = (s: string) =>
          setMessages((prev) => prev.map((m) => (m.id === thinkingId ? { ...m, thinkingSteps: [...(m.thinkingSteps ?? []), s] } : m)));
        const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

        addStep("Reading the brief");
        let interp: {
          objective?: string; totalBudget?: number; goalConversions?: number | null;
          goalRoas?: number | null; summary?: string; assumptions?: string[]; missing?: string[];
        } = {};
        try {
          const res = await fetch("/api/media-plan/interpret", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ brief: briefText, clientName }),
          });
          interp = await res.json();
        } catch {
          interp = {};
        }
        await delay(500);

        // Never block. If budget/goal are missing, proceed with a RECOMMENDED
        // default anchored to the client's data — and label it clearly in the
        // narration so it reads as a starting point, not an invented fact.
        const hasBudget = typeof interp.totalBudget === "number" && interp.totalBudget > 0;
        const hasGoal = interp.goalConversions != null || interp.goalRoas != null;

        await delay(700); addStep(`Pulling ${clientName}'s last 90 days of performance`);
        await delay(800); addStep("Computing blended ROAS and CPA by channel");
        await delay(800); addStep("Modeling channel allocation across the funnel");
        await delay(700);

        const objective = interp.objective || "sales";
        const total = typeof interp.totalBudget === "number" && interp.totalBudget > 0 ? interp.totalBudget : 0;
        const goal = { conversions: interp.goalConversions ?? undefined, roas: interp.goalRoas ?? undefined };
        // Stamp the chat session so reopening the plan restores this conversation.
        const plan = { ...buildMediaPlan(adv, objective, total, goal, getActiveClient()?.id), chatSessionId: currentSessionIdRef.current ?? undefined };
        setActiveMediaPlan(plan);
        saveMediaPlan(plan);

        const conv = plan.summary.estConversions;
        const goalConv = plan.summary.targets.conversions;
        let gapLine = "";
        if (goal.conversions && conv < goalConv) {
          const pct = Math.round((conv / goalConv) * 100);
          gapLine = `\n\nHeads up: this forecasts **${conv.toLocaleString()} conversions — about ${pct}% of your ${goalConv.toLocaleString()} goal** at ${plan.summary.estRoas}× ROAS. To close it I can shift budget into retargeting or raise the total — just tell me.`;
        }
        const assumptionLine = interp.assumptions && interp.assumptions.length
          ? `\n\n_Assumed: ${interp.assumptions.join("; ")} — change anything on the canvas._`
          : "";
        const headline = interp.summary ? `${interp.summary}\n\n` : "";
        const budgetNote = !hasBudget
          ? `\n\n**Budget:** you didn't set one, so I started you at **$${plan.summary.totalBudget.toLocaleString()}** — ${clientName}'s recent run-rate (a recommended starting point). Change it anytime.`
          : "";
        const goalNote = !hasGoal
          ? `\n\n**Target:** none set — I'm forecasting against ${clientName}'s blended ROAS. Give me a goal and I'll measure against it.`
          : "";
        const narrationText = `${headline}Here's the plan for **${clientName}** — ${plan.campaigns.length} campaigns across $${plan.summary.totalBudget.toLocaleString()}, anchored to their real performance. **DOOH is in closed beta** — say the word and we'll activate it manually.${budgetNote}${goalNote}${gapLine}${assumptionLine}`;

        setMessages((prev) => prev.map((m) => (m.id === thinkingId ? { ...m, content: narrationText } : m)));
        setState(autoArtifactLayout());
        collapseLeftRail();
      };

      // Dismiss any pending setup-mode choice card — user chose to type instead
      // Fall back to the default mode (conversational/Guided)
      setMessages((prev) => {
        const hasSetupCard = prev.some(
          (m) => m.toolCall?.type === "choices" && m.toolCall.field === "setup-mode"
        );
        if (hasSetupCard) {
          // Remove the setup-mode choice card and the intro message before it
          return prev.filter(
            (m) => !(m.toolCall?.type === "choices" && m.toolCall.field === "setup-mode")
          );
        }
        return prev;
      });
      // If mode was never set, save the default now so the card doesn't reappear
      if (typeof window !== "undefined" && !localStorage.getItem("fuseiq-chat-mode")) {
        setChatMode("plan");
      }

      // Use refs for flow state — avoids stale closure when called via setTimeout
      const currentStrategyIntent = strategyIntentRef.current;
      const currentCampaignIntent = campaignIntentRef.current;

      // If in strategy flow, handle inline
      if (currentStrategyIntent) {
        const parsed = parseIntent(content);
        const merged: StrategyIntent = {
          ...currentStrategyIntent,
          ...(parsed.objective ? { objective: parsed.objective } : {}),
        };
        evaluateStrategyFlow(merged, userMsg);
        return;
      }

      // If in legacy campaign flow
      if (currentCampaignIntent) {
        const parsed = parseIntent(content);
        const merged = mergeIntent(currentCampaignIntent, parsed);
        evaluateAndRespond(merged, userMsg);
        return;
      }

      // Active media plan: interpret freeform edit commands ("change CTV budget
      // to 11,458", "shift $10k from DOOH to social", "why CTV?") as plan edits —
      // BEFORE intent routing, so they don't misfire the campaign/keyword flow.
      // Same single-source recalc as the chips, so chat and canvas always agree.
      if (activeMediaPlanRef.current) {
        const plan = activeMediaPlanRef.current;
        const cmd = parseMediaPlanCommand(content, plan, lastEditedChannelRef.current);
        const keyOf = (id: string) => plan.campaigns.find((c) => c.id === id)?.channel ?? null;
        if (cmd) {
          setMessages((prev) => [...prev, userMsg]);
          let p = plan;
          let touched: string[] = [];
          let reply = "";
          const f = (n: number) => n.toLocaleString();
          const outcome = (pl: typeof plan) =>
            `Now forecasting **${f(pl.summary.estConversions)} conversions** at **${pl.summary.estRoas}× ROAS** on $${f(pl.summary.totalBudget)} total.`;
          if (cmd.kind === "set") {
            p = editCampaignBudget(plan, cmd.channelId, cmd.amount);
            touched = [cmd.channelId];
            lastEditedChannelRef.current = keyOf(cmd.channelId);
            reply = `Set ${cmd.channelLabel} to $${f(cmd.amount)}. ${outcome(p)}`;
          } else if (cmd.kind === "delta") {
            const c = plan.campaigns.find((x) => x.id === cmd.channelId);
            const nb = Math.max(0, (c?.budget ?? 0) + cmd.amount);
            p = editCampaignBudget(plan, cmd.channelId, nb);
            touched = [cmd.channelId];
            lastEditedChannelRef.current = keyOf(cmd.channelId);
            reply = `${cmd.amount >= 0 ? "Increased" : "Reduced"} ${cmd.channelLabel} to $${f(nb)}. ${outcome(p)}`;
          } else if (cmd.kind === "shift") {
            const from = plan.campaigns.find((x) => x.id === cmd.fromId);
            const to = plan.campaigns.find((x) => x.id === cmd.toId);
            const move = Math.min(cmd.amount, from?.budget ?? 0);
            p = editCampaignBudget(plan, cmd.toId, (to?.budget ?? 0) + move);
            p = editCampaignBudget(p, cmd.fromId, (from?.budget ?? 0) - move);
            touched = [cmd.fromId, cmd.toId];
            lastEditedChannelRef.current = keyOf(cmd.toId);
            reply = `Moved $${f(move)} from ${cmd.fromLabel} to ${cmd.toLabel}. ${outcome(p)}`;
          } else if (cmd.kind === "toggle") {
            const c = plan.campaigns.find((x) => x.id === cmd.channelId);
            if (c && c.enabled !== cmd.on) p = toggleCampaign(plan, cmd.channelId);
            touched = [cmd.channelId];
            lastEditedChannelRef.current = keyOf(cmd.channelId);
            reply = `Turned ${cmd.on ? "on" : "off"} ${cmd.channelLabel}. ${outcome(p)}`;
          } else if (cmd.kind === "total") {
            p = setTotalBudget(plan, cmd.amount);
            touched = ["total", ...p.campaigns.filter((c) => c.enabled).map((c) => c.id)];
            reply = `Set the total to $${f(cmd.amount)} and rescaled the mix. ${outcome(p)}`;
          } else {
            // why — explanation only, no mutation
            reply = WHY_CHANNEL[cmd.channelKey];
          }
          if (cmd.kind !== "why") { const np = { ...p, aiTouched: touched }; setActiveMediaPlan(np); saveMediaPlan(np); }
          const replyMsg: ChatMessage = { id: nextId(), role: "assistant", content: reply };
          setMessages((prev) => [...prev, replyMsg]);
          return;
        }
        // Funnel-stage toggle: "disable conversion" / "turn off awareness" toggles
        // every channel in that stage — and ACTUALLY mutates the plan (no fabrication).
        const lc = content.toLowerCase();
        const stageHit = /\b(awareness|consideration|conversion)\b/.exec(lc);
        const wantsOff = /\b(disable|turn off|pause|remove|drop|stop|kill)\b/.test(lc);
        const wantsOn = /\b(enable|turn on|add back|resume|reactivate)\b/.test(lc);
        if (stageHit && (wantsOff || wantsOn)) {
          setMessages((prev) => [...prev, userMsg]);
          const stage = stageHit[1];
          const turnOn = wantsOn && !wantsOff;
          let p = plan;
          const ids: string[] = [];
          for (const c of plan.campaigns) {
            if (c.funnelStage === stage && c.enabled !== turnOn) {
              p = toggleCampaign(p, c.id);
              ids.push(c.id);
            }
          }
          const f = (n: number) => n.toLocaleString();
          if (ids.length === 0) {
            setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: `The ${stage} stage is already ${turnOn ? "on" : "off"} — nothing to change.` }]);
            return;
          }
          const np = { ...p, aiTouched: ids };
          setActiveMediaPlan(np);
          saveMediaPlan(np);
          setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: `${turnOn ? "Re-enabled" : "Disabled"} the ${stage} stage (${ids.length} channel${ids.length === 1 ? "" : "s"}). Now forecasting **${f(np.summary.estConversions)} conversions** at **${np.summary.estRoas}× ROAS** on $${f(np.summary.totalBudget)} total.` }]);
          return;
        }

        // A question (incl. point-and-chat "Re: …") — answer it conversationally
        // with the LLM (grounded in brand + the selected element), NOT as an edit.
        // Checked before the edit fallback so "what would you change?" isn't
        // mistaken for an edit command just because it contains "change".
        const isQuestionLike =
          /\?\s*$/.test(content.trim()) ||
          /^(re:|why\b|what\b|which\b|how\b|is\b|are\b|should\b|does\b|do\b|can you|could you|explain|tell me|walk me|where\b|when\b|who\b)/i.test(content.trim());
        if (isQuestionLike) {
          setMessages((prev) => [...prev, userMsg]);
          streamReply([...messagesRef.current, userMsg], content);
          return;
        }

        // Edit-shaped but unresolved: ask rather than letting the model fabricate a
        // change it didn't make. (Broadened to catch toggle/disable phrasing too.)
        const looksLikeEdit = /\b(change|set|shift|move|increase|decrease|raise|lower|cut|bump|budget|spend|reallocate|disable|enable|turn off|turn on|pause|remove|drop|toggle)\b/.test(lc);
        if (looksLikeEdit) {
          setMessages((prev) => [...prev, userMsg]);
          const msg: ChatMessage = {
            id: nextId(),
            role: "assistant",
            content: "I can adjust the plan — which channel and to what? e.g. \"change CTV to $14,000\", \"shift $10k from DOOH to social\", or \"set the total to $90k\".",
          };
          setMessages((prev) => [...prev, msg]);
          return;
        }
      }

      // Media-plan brief intake: the previous turn invited a brief, so treat this
      // message as the brief (intercept BEFORE intent routing so "campaigns"/
      // "acquisition" in the brief don't misfire other flows). Then ask Kirby's
      // two clarifying questions + surface the advertiser's data, with quick-reply
      // chips. (Content mirrors the AdRoll Media Planner spec; rendered in our card.)
      if (mediaPlanFlowRef.current.stage === "awaiting-brief") {
        // Don't build from a non-brief like "help me" — re-prompt with the sample.
        if (!looksLikeBriefText(content)) {
          setMessages((prev) => [
            ...prev,
            userMsg,
            { id: nextId(), role: "assistant", content: "I need the brief to build a real plan — the goal, budget, audience, and timeline. Paste it, or use the sample below to see it in action." },
            sampleBriefCard(),
          ]);
          return;
        }
        mediaPlanFlowRef.current = { stage: "idle", brief: content };
        setMessages((prev) => [...prev, userMsg]);
        void doBriefBuild(content); // LLM reads the brief → builds (anchored numbers)
        return;
      }

      // Skip intent routing when called from priority cards / proactive nudges —
      // these prompts should go straight to the conversational API, not get
      // caught by keyword-based intent detection (e.g. "spend" triggering budget flow).
      if (options?.skipIntentRouting) {
        setMessages((prev) => [...prev, userMsg]);
        streamReply([...messagesRef.current, userMsg], content);
        return;
      }

      // ADVISE / RESEARCH MODE: don't enter the build flows. These modes
      // recommend and analyze — they answer conversationally with evidence
      // (the API disables the build_campaign_plan tool for these modes).
      if (chatMode === "advise" || chatMode === "research") {
        setMessages((prev) => [...prev, userMsg]);
        streamReply([...messagesRef.current, userMsg], content);
        return;
      }

      // Check for campaign intent — route to strategy flow instead of API
      const lower = content.toLowerCase();

      // ANALYTICAL-QUESTION guard — a question ABOUT the account's data ("what's
      // my best channel?", "where am I overspending?", "which has the worst CPA?")
      // must be ANSWERED by the LLM (grounded in the PERFORMANCE DATA context),
      // not hijacked into the budget/media-plan build flow. Build commands
      // ("build/launch a plan") are excluded so those still route to the builder.
      const isQuestion =
        /\?\s*$/.test(content.trim()) ||
        /^(what|which|where|how|why|who|show me|tell me|is my|are my|do i|does my|how's|hows|compare|break ?down|list|rank|summari[sz]e|give me|analyze|analyse)\b/i.test(content.trim());
      const mentionsData =
        /\b(roas|cpa|cpc|ctr|spend|spending|overspend|over-?spending|budget|channel|channels|performance|perform|performing|conversion|conversions|revenue|metric|best|worst|trend|trending|compare|comparison|breakdown|cost|impressions|clicks|cac|underperform)\b/i.test(
          lower
        );
      const isBuildVerb =
        /\b(build|create|launch|set up|set-up|make me|draft|plan a|plan me|put together|spin up|generate a)\b/i.test(lower);
      if (isQuestion && mentionsData && !isBuildVerb) {
        setMessages((prev) => [...prev, userMsg]);
        streamReply([...messagesRef.current, userMsg], content);
        return;
      }

      // Competitive intelligence intent — opens the brief artifact (no pixel needed)
      const isCompetitiveIntent =
        lower.includes("competitor") ||
        lower.includes("competitive") ||
        lower.includes("competition") ||
        lower.includes("positioned") ||
        lower.includes("up against");

      if (isCompetitiveIntent) {
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);
        const brand = brandRef.current || getCurrentBrand();
        const adv = advertiser || {
          id: "adv-ffern-co",
          companyName: brand?.name || "Your brand",
          websiteUrl: brand?.domain || "your site",
          industry: mapBrandIndustryToIAB(brand?.industry || "other"),
          restrictedCategories: [],
        };
        setTimeout(() => {
          const brief = buildCompetitiveBrief(adv);
          saveBrief(brief);
          setActiveBrief(brief);
          const ack: ChatMessage = {
            id: nextId(),
            role: "assistant",
            content: `Pulled ${adv.companyName}'s competitive position from public web data — no pixel needed. Top competitors, where they're winning, and your white space are on the canvas. Connect your pixel to track share shifts continuously.`,
          };
          setMessages((prev) => [...prev, ack]);
          setIsLoading(false);
          setState(autoArtifactLayout());
          collapseLeftRail();
        }, 600);
        return;
      }

      // Operator intent — delegate execution to the AI within guardrails (Phase 9D).
      // Checked before campaign so "run my campaign" routes here.
      const isOperatorIntent =
        lower.includes("let the ai run") ||
        lower.includes("let ai run") ||
        lower.includes("run it for me") ||
        lower.includes("run this for me") ||
        lower.includes("run my campaign") ||
        lower.includes("run with ai") ||
        lower.includes("autopilot") ||
        lower.includes("manage it for me") ||
        lower.includes("operator");

      if (isOperatorIntent) {
        setMessages((prev) => [...prev, userMsg]);
        // Read strategies at call time (avoids stale-closure values) — the most
        // recently modified saved strategy is the one to run.
        let strat: StrategyPlan | null = null;
        try {
          const raw = typeof window !== "undefined" ? localStorage.getItem("fuseiq-strategies") : null;
          const list = raw ? (JSON.parse(raw) as StrategyPlan[]) : [];
          strat = list.length > 0 ? list[list.length - 1] : null;
        } catch { strat = null; }
        if (!strat) {
          const msg: ChatMessage = {
            id: nextId(),
            role: "assistant",
            content: "I can run a campaign for you once one exists — build or open a campaign first, then ask me to run it.",
          };
          setMessages((prev) => [...prev, msg]);
          return;
        }
        setIsLoading(true);
        setTimeout(() => {
          setActiveOperator(buildOperatorPlan(strat));
          const ack: ChatMessage = {
            id: nextId(),
            role: "assistant",
            content: `I can run ${strat.name} for you — within guardrails you set: a budget cap, how often I optimize, and exactly which levers I may touch. Review the terms on the right and authorize, or keep manual control.`,
          };
          setMessages((prev) => [...prev, ack]);
          setIsLoading(false);
          setState(autoArtifactLayout());
          collapseLeftRail();
        }, 500);
        return;
      }

      // Media-plan intent — AGENCY persona only (cross-channel media planning is an
      // agency capability). Checked BEFORE campaign ("media plan" also matches campaign).
      // Unlike a generic template, we ask ONE sharp question (objective) then build a
      // tailored, editable artifact; budget is inferred and editable.
      const personaId = typeof window !== "undefined" ? localStorage.getItem("fuseiq-persona") : null;
      const isMediaPlanIntent =
        personaId === "cynthia-agency" &&
        (lower.includes("media plan") ||
          lower.includes("plan my media") ||
          lower.includes("plan my spend across") ||
          lower.includes("channel plan") ||
          lower.includes("plan my channels"));

      if (isMediaPlanIntent) {
        setMessages((prev) => [...prev, userMsg]);
        const brand = brandRef.current || getCurrentBrand();
        const brandName = brand?.name || "your brand";

        // If the message ALREADY is a substantive brief (budget / goal / detail),
        // don't re-ask for it — treat it as the brief and go straight to clarify.
        const looksLikeBrief =
          content.trim().length > 80 ||
          /\$\s?\d|\bbudget\b|\broas\b|\bgoal\b|\d{3,}\s*(?:new\s+)?(?:customer|conversion|acquisition)/i.test(content);

        if (looksLikeBrief) {
          mediaPlanFlowRef.current = { stage: "idle", brief: content };
          void doBriefBuild(content); // LLM reads the brief → builds (anchored numbers)
          return;
        }

        // Bare request ("build a media plan") — ask for the brief.
        mediaPlanFlowRef.current = { stage: "awaiting-brief", brief: "" };
        const ackMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: `Let's build a media plan for ${brandName}. Paste the client brief or describe the campaign — goal, budget, audience, timeline — and I'll pull in ${brandName}'s account data, ask anything that's missing, then build it.`,
        };
        setMessages((prev) => [...prev, ackMsg]);
        return;
      }

      // Audience intent — must be checked BEFORE campaign (because "build a" would match "build an audience")
      const isAudienceIntent =
        lower.includes("audience") ||
        lower.includes("segment") ||
        lower.includes("lookalike") ||
        lower.includes("retarget site visitor") ||
        lower.includes("customer list");

      if (isAudienceIntent) {
        setMessages((prev) => [...prev, userMsg]);
        const brand = brandRef.current;
        const brandName = brand?.name || "your brand";

        // EXPRESS MODE: Build audience immediately with smart defaults
        if (chatMode === "express") {
          setIsLoading(true);

          // Infer audience type from message
          let audienceType: AudienceSegmentType = "retargeting";
          if (lower.includes("lookalike")) audienceType = "lookalike";
          else if (lower.includes("customer list") || lower.includes("upload")) audienceType = "customer-list";
          else if (lower.includes("interest")) audienceType = "interest";

          const typeLabels: Record<string, string> = {
            retargeting: "Site Visitors — Last 30 Days",
            lookalike: "Lookalike — Top Customers",
            "customer-list": "Customer List Upload",
            interest: "Interest-based Targeting",
          };
          const rulesMap: Record<string, { label: string; value: string; source: "user_input" | "ai_inferred" }[]> = {
            retargeting: [
              { label: "Source", value: "Website visitors", source: "user_input" },
              { label: "Lookback window", value: "Last 30 days", source: "ai_inferred" },
              { label: "Exclude", value: "Existing customers (purchased in last 90 days)", source: "ai_inferred" },
              { label: "Min page views", value: "2+ pages visited", source: "ai_inferred" },
            ],
            lookalike: [
              { label: "Seed audience", value: "Top 20% customers by LTV", source: "ai_inferred" },
              { label: "Similarity", value: "1-3% lookalike expansion", source: "ai_inferred" },
              { label: "Geography", value: "Same markets as seed audience", source: "ai_inferred" },
              { label: "Exclude", value: "Existing customers and recent site visitors", source: "ai_inferred" },
            ],
            "customer-list": [
              { label: "Source", value: "Customer email list", source: "user_input" },
              { label: "Match type", value: "Email + phone hashed match", source: "ai_inferred" },
              { label: "Refresh", value: "Syncs daily from CRM", source: "ai_inferred" },
            ],
            interest: [
              { label: "Interests", value: "Luxury goods, natural beauty, artisan products", source: "ai_inferred" },
              { label: "Demographics", value: "25-54, high household income", source: "ai_inferred" },
              { label: "Behaviors", value: "Online shoppers, DTC brand buyers", source: "ai_inferred" },
            ],
          };
          const sizeMap: Record<string, string> = {
            retargeting: "18,400 - 22,100",
            lookalike: "340,000 - 520,000",
            "customer-list": "8,200 - 9,500",
            interest: "1.2M - 2.4M",
          };

          setTimeout(() => {
            const segment: AudienceSegment = {
              id: `aud-${Date.now()}`,
              name: `${brandName} — ${typeLabels[audienceType] || "Audience Segment"}`,
              type: audienceType,
              status: "draft",
              advertiserId: brand?.name || "Unknown",
              estimatedSize: sizeMap[audienceType] || "Unknown",
              rules: (rulesMap[audienceType] || []).map((r) => ({
                label: r.label,
                value: r.value,
                provenance: { source: r.source, reasoning: `Inferred for ${brandName} ${audienceType} audience` },
              })),
              platforms: ["Meta", "Google", "TikTok"],
              createdAt: new Date().toISOString(),
              lastModifiedAt: new Date().toISOString(),
            };

            setActiveAudience(segment);

            const ackMsg: ChatMessage = {
              id: nextId(),
              role: "assistant",
              content: `Built a ${typeLabels[audienceType]?.toLowerCase() || audienceType} segment for ${brandName}. Your audience is on the canvas — review the targeting rules, edit anything, then save when ready.`,
            };
            setMessages((prev) => [...prev, ackMsg]);
            setIsLoading(false);
            setState(autoArtifactLayout());
            collapseLeftRail();
          }, 600);
          return;
        }

        // GUIDED MODE: Walk through step by step
        const ackMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: brand
            ? `Let's build an audience for ${brand.name}. What kind of segment are you looking for?`
            : "Let's build your audience segment. What are you looking for?",
        };

        const choiceMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: "",
          toolCall: {
            type: "choices",
            field: "audience-type",
            question: "What type of audience do you want to build?",
            subtitle: `We'll create a segment you can use across ${brandName}'s campaigns.`,
            step: 1,
            totalSteps: 1,
            multiSelect: false,
            options: [
              { id: "retargeting", label: "Site visitors", detail: "Retarget people who visited your site in the last 30 days" },
              { id: "lookalike", label: "Lookalike audience", detail: "Find new customers similar to your best buyers", recommended: true },
              { id: "customer-list", label: "Customer list", detail: "Upload or sync your existing customer data" },
              { id: "interest", label: "Interest-based", detail: "Target by interests, behaviors, and demographics" },
            ],
          },
        };

        setMessages((prev) => [...prev, ackMsg, choiceMsg]);
        return;
      }

      const isCampaignIntent =
        !isAudienceIntent && (
          lower.includes("campaign") ||
          lower.includes("retargeting") ||
          lower.includes("re-targeting") ||
          lower.includes("prospecting") ||
          lower.includes("awareness") ||
          lower.includes("lead gen") ||
          lower.includes("app promotion") ||
          lower.includes("media plan") ||
          lower.includes("launch a") ||
          lower.includes("build a") ||
          lower.includes("ctv") ||
          lower.includes("connected tv") ||
          lower.includes("streaming")
        );

      if (isCampaignIntent && !currentStrategyIntent) {
        const parsed = parseIntent(content);
        const brand = brandRef.current;

        // Auto-infer advertiser from brand profile — never ask what we already know
        let hasAdv = !!advertiser;
        if (!hasAdv && brand) {
          const inferred = {
            id: `adv-${Date.now()}`,
            companyName: brand.name,
            websiteUrl: brand.domain,
            industry: mapBrandIndustryToIAB(brand.industry),
            restrictedCategories: [] as IABRestrictedCategory[],
          };
          setAdvertiser(inferred);
          hasAdv = true;
        }

        const intent: StrategyIntent = {
          ...(parsed.objective ? { objective: parsed.objective } : {}),
        };

        // Pre-fill advertiser setup so the form is skipped
        if (brand && hasAdv) {
          intent.advertiserSetup = {
            companyName: brand.name,
            websiteUrl: brand.domain,
            industry: mapBrandIndustryToIAB(brand.industry),
            restrictedCategories: [],
          };
        }

        setMessages((prev) => [...prev, userMsg]);

        // EXPRESS MODE: Skip guided steps, build strategy with defaults + progressive thinking
        if (chatMode === "express") {
          setIsLoading(true);
          const directIntent: StrategyIntent = {
            ...intent,
            objective: parsed.objective || "sales",
            selectedKeywords: [],
            allKeywords: [],
          };

          const adv = advertiser || {
            id: `adv-${Date.now()}`,
            companyName: brand?.name || "Company",
            websiteUrl: brand?.domain || "example.com",
            industry: (brand ? mapBrandIndustryToIAB(brand.industry) : "other") as IABIndustry,
            restrictedCategories: [] as IABRestrictedCategory[],
          };

          if (!advertiser && brand) {
            setAdvertiser(adv);
          }

          // Progressive thinking steps
          const objLabel = directIntent.objective || "campaign";
          const advName = adv.companyName;
          const thinkingSteps = [
            `Analyzing brief — ${objLabel} campaign for ${advName}`,
            "Applying smart defaults for targeting and placements",
            "Allocating budget across recommended channels",
            "Generating forecast and confidence scores",
            "Assembling your media plan",
          ];

          const stepDelay = 500;
          const thinkingId = nextId();
          const thinkingMsg: ChatMessage = {
            id: thinkingId,
            role: "assistant",
            content: "",
            thinkingSteps: [],
          };
          setMessages((prev) => [...prev, thinkingMsg]);

          thinkingSteps.forEach((step, i) => {
            setTimeout(() => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === thinkingId
                    ? { ...m, thinkingSteps: thinkingSteps.slice(0, i + 1) }
                    : m
                )
              );
            }, (i + 1) * stepDelay);
          });

          setTimeout(() => {
            const strategy = buildStrategyFromIntent(directIntent, adv);
            strategy.keywords = [];
            setActiveStrategy(strategy);
            saveStrategy(strategy);

            setMessages((prev) =>
              prev.map((m) =>
                m.id === thinkingId
                  ? {
                      ...m,
                      content: `Built a ${objLabel} strategy for ${advName} with recommended defaults. Your media plan is on the canvas — review each section, edit anything, then save or send for approval when ready.`,
                    }
                  : m
              )
            );
            setIsLoading(false);
            setState(autoArtifactLayout());
            collapseLeftRail();
          }, thinkingSteps.length * stepDelay + 500);
          return;
        }

        // GUIDED MODE: Walk through step by step
        // Check for retargeting prerequisite — pixel/tag must be installed
        const isRetargeting = lower.includes("retargeting") || lower.includes("re-targeting") || lower.includes("site visitor");
        const brandName = brand?.name || "your brand";

        if (isRetargeting) {
          // Surface prerequisite notice — retargeting needs a pixel
          const prereqMsg: ChatMessage = {
            id: nextId(),
            role: "assistant",
            content: `Got it — retargeting campaign for ${brandName}. Before I build this, a heads up: retargeting requires a tracking pixel on your site to identify visitors. I don't see one connected yet.\n\nI'll build the campaign plan so you can review it, but you'll need to install the pixel before activating. I can help with that after.`,
          };
          setMessages((prev) => [...prev, prereqMsg]);
        } else {
          const isCTVBrief = lower.includes("ctv") || lower.includes("connected tv") || lower.includes("streaming");
          const objDescription = isCTVBrief
            ? `CTV/OTT awareness campaign for ${brandName}`
            : parsed.objective
            ? `${parsed.objective} campaign for ${brandName}`
            : null;

          const ackMsg: ChatMessage = {
            id: nextId(),
            role: "assistant",
            content: objDescription
              ? `Got it — ${objDescription}. Let me set that up.`
              : brand
              ? `Let's build a campaign for ${brand.name}. First — what's the objective?`
              : "Let's build your campaign. What's the objective?",
          };
          setMessages((prev) => [...prev, ackMsg]);
        }

        setStrategyIntent(intent);
        evaluateStrategyFlow(intent);
        return;
      }

      // --- PERFORMANCE INTENT ---
      // Skip the connection gate — show Ffern data immediately on canvas
      const isPerformanceIntent =
        lower.includes("performing") ||
        lower.includes("performance") ||
        lower.includes("how is") ||
        lower.includes("what changed");

      if (isPerformanceIntent) {
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);

        const brand = brandRef.current;
        const period = { month: 5, year: 2026 };
        const brandName = brand?.name || "your channels";

        // Realistic progressive thinking sequence
        const thinkingSteps = [
          `Pulling ${brandName}'s ad platform data — May 2026`,
          "Aggregating spend, revenue, and conversion metrics across channels",
          "Calculating ROAS and CPA by channel with month-over-month trends",
          "Checking for anomalies and pacing against monthly budget",
          "Generating attribution breakdown and confidence scores",
          "Drafting recommended next moves based on what changed",
        ];

        // Show thinking steps progressively, then deliver result
        const stepDelay = 500;
        const thinkingId = nextId();
        const thinkingMsg: ChatMessage = {
          id: thinkingId,
          role: "assistant",
          content: "",
          thinkingSteps: [],
        };
        setMessages((prev) => [...prev, thinkingMsg]);

        thinkingSteps.forEach((step, i) => {
          setTimeout(() => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === thinkingId
                  ? { ...m, thinkingSteps: thinkingSteps.slice(0, i + 1) }
                  : m
              )
            );
          }, (i + 1) * stepDelay);
        });

        // After all thinking steps, deliver the actual result
        setTimeout(() => {
          try {
            const perfData = brand?.domain === "ffern.co" ? FFERN_SEED_PERFORMANCE : SEED_PERFORMANCE;
            const anomalyData = brand?.domain === "ffern.co" ? FFERN_SEED_ANOMALIES : SEED_ANOMALIES;
            const narrative = buildNarrativeFromSeed(perfData, anomalyData, period);
            if (brand) {
              narrative.name = `${brand.name} — May 2026 Performance`;
              narrative.advertiserId = brand.name;
            }
            saveNarrative(narrative);
            setActiveNarrative(narrative);

            // Replace the thinking message with the final response (keeps thinking steps)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === thinkingId
                  ? {
                      ...m,
                      content: brand
                        ? `Here's ${brand.name}'s performance for the last 30 days. Spend, attribution, changes, and recommended moves — each section shows its confidence level. Review on the canvas, edit anything, or ask me to dig deeper.`
                        : `Here's your performance overview for May 2026. Review each section on the canvas.`,
                    }
                  : m
              )
            );

            setState(autoArtifactLayout());
            collapseLeftRail();

            // Notice → Propose → Authorize: offer real next moves so performance
            // isn't a dead end (it used to stop at a bubble + canvas). Each label
            // routes through sendMessage to a working flow.
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: "assistant",
                content: "",
                toolCall: {
                  type: "choices",
                  field: "next-step",
                  question: "What would you like to do next?",
                  step: 1,
                  totalSteps: 1,
                  multiSelect: false,
                  options: [
                    { id: "pp-shift", label: "Where should I shift budget to improve ROAS?" },
                    { id: "pp-narrative", label: "Draft the CFO narrative from this" },
                    { id: "pp-optimize", label: "Show me the top optimization moves" },
                  ],
                },
              },
            ]);
          } catch {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === thinkingId
                  ? { ...m, content: "Couldn't generate the performance view — no data for that period." }
                  : m
              )
            );
          }
          setIsLoading(false);
        }, thinkingSteps.length * stepDelay + 800);
        return;
      }

      // --- CONNECT ACCOUNTS INTENT ---
      // This is a real user action — show the platform selector
      const isConnectIntent =
        lower.includes("connect my ad") ||
        lower.includes("connect your ad") ||
        lower.includes("connect accounts") ||
        lower.includes("data source") ||
        lower.includes("link google") ||
        lower.includes("link meta");

      if (isConnectIntent) {
        setMessages((prev) => [...prev, userMsg]);

        const brand = brandRef.current;
        const ackMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: brand
            ? `Let's connect ${brand.name}'s ad accounts. Authorize the platforms you use — you can always add more later.`
            : "Let's get your accounts connected. Pick the ones you use.",
        };

        const connectMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: "",
          toolCall: {
            type: "platform-connect",
            field: `connect:connect`,
            platformIds: [],
            intentTag: "connect",
          },
        };

        setMessages((prev) => [...prev, ackMsg, connectMsg]);
        return;
      }

      // --- BUDGET / SPEND PLANNING INTENT ---
      // Build a budget-focused strategy card on the canvas
      const isBudgetIntent =
        lower.includes("plan my monthly") ||
        lower.includes("plan your monthly") ||
        lower.includes("plan spend") ||
        lower.includes("set my budget") ||
        lower.includes("set your budget") ||
        lower.includes("budget") ||
        (lower.includes("spend") && !lower.includes("performing"));

      if (isBudgetIntent) {
        setMessages((prev) => [...prev, userMsg]);

        const brand = brandRef.current;
        // Auto-infer advertiser
        let hasAdv = !!advertiser;
        if (!hasAdv && brand) {
          const inferred = {
            id: `adv-${Date.now()}`,
            companyName: brand.name,
            websiteUrl: brand.domain,
            industry: mapBrandIndustryToIAB(brand.industry),
            restrictedCategories: [] as IABRestrictedCategory[],
          };
          setAdvertiser(inferred);
          hasAdv = true;
        }

        // Show budget selection card
        const ackMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: brand
            ? `Let's set ${brand.name}'s monthly budget. This determines how we pace and allocate across channels.`
            : "Let's plan your monthly spend.",
        };

        const budgetMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: "",
          toolCall: {
            type: "choices",
            field: "budget-direct",
            question: "What's your monthly budget?",
            subtitle: brand ? `We'll allocate across the best channels for ${brand.name}.` : "This helps optimize channel allocation and pacing.",
            step: 1,
            totalSteps: 1,
            multiSelect: false,
            options: [
              { id: "3000", label: "$3,000/month", detail: "Starter — focused on 1-2 top channels" },
              { id: "5000", label: "$5,000/month", detail: "Growth — multi-channel with testing budget", recommended: true },
              { id: "10000", label: "$10,000/month", detail: "Scale — full channel mix with optimization" },
              { id: "custom", label: "Custom amount" },
            ],
          },
        };

        setMessages((prev) => [...prev, ackMsg, budgetMsg]);
        return;
      }

      // --- NARRATIVE INTENT (CFO reports, executive summaries) ---
      const isNarrativeIntent =
        lower.includes("cfo narrative") ||
        lower.includes("cfo report") ||
        lower.includes("monthly report") ||
        lower.includes("executive summary") ||
        lower.includes("budget meeting") ||
        (lower.includes("narrative") && lower.includes("may")) ||
        (lower.includes("draft") && lower.includes("narrative"));

      if (isNarrativeIntent) {
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);

        const brand = brandRef.current;
        const period = { month: 5, year: 2026 };
        const brandName = brand?.name || "your brand";

        const thinkingSteps = [
          `Pulling ${brandName}'s May 2026 channel data`,
          "Computing spend-by-channel breakdown and attribution percentages",
          "Identifying what changed month-over-month with root causes",
          "Generating recommended next moves with confidence levels",
          "Formatting as executive narrative with five sections",
        ];

        const stepDelay = 550;
        const thinkingId = nextId();
        const thinkingMsg: ChatMessage = {
          id: thinkingId,
          role: "assistant",
          content: "",
          thinkingSteps: [],
        };
        setMessages((prev) => [...prev, thinkingMsg]);

        thinkingSteps.forEach((step, i) => {
          setTimeout(() => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === thinkingId
                  ? { ...m, thinkingSteps: thinkingSteps.slice(0, i + 1) }
                  : m
              )
            );
          }, (i + 1) * stepDelay);
        });

        setTimeout(() => {
          try {
            const perfData = brand?.domain === "ffern.co" ? FFERN_SEED_PERFORMANCE : SEED_PERFORMANCE;
            const anomalyData = brand?.domain === "ffern.co" ? FFERN_SEED_ANOMALIES : SEED_ANOMALIES;
            const narrative = buildNarrativeFromSeed(perfData, anomalyData, period);
            if (brand) {
              narrative.name = `${brand.name} — May 2026 Executive Summary`;
              narrative.advertiserId = brand.name;
            }
            saveNarrative(narrative);
            setActiveNarrative(narrative);

            setMessages((prev) =>
              prev.map((m) =>
                m.id === thinkingId
                  ? {
                      ...m,
                      content: brand
                        ? `Drafted ${brand.name}'s May performance narrative. Five sections with provenance — review on the canvas.`
                        : `Drafted your May 2026 marketing performance narrative. Review on the canvas.`,
                    }
                  : m
              )
            );

            setState(autoArtifactLayout());
            collapseLeftRail();
          } catch {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === thinkingId
                  ? { ...m, content: "Couldn't generate the narrative — no data for that period." }
                  : m
              )
            );
          }
          setIsLoading(false);
        }, thinkingSteps.length * stepDelay + 800);
        return;
      }

      // --- OPTIMIZATION INTENT ---
      const isOptimizationIntent =
        lower.includes("optimization") ||
        lower.includes("optimize") ||
        lower.includes("improve") ||
        (lower.includes("ideas") && (lower.includes("campaign") || lower.includes("ad"))) ||
        lower.includes("what should i change") ||
        lower.includes("recommendations");

      if (isOptimizationIntent) {
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);

        const brand = brandRef.current;
        const brandName = brand?.name || "your campaigns";

        const thinkingSteps = [
          `Reviewing ${brandName}'s active campaigns and recent performance`,
          "Comparing channel-level ROAS and CPA against benchmarks",
          "Identifying underperforming segments and budget reallocation opportunities",
          "Checking creative fatigue signals and audience overlap",
          "Ranking moves by expected impact and confidence level",
        ];

        const stepDelay = 500;
        const thinkingId = nextId();
        const thinkingMsg: ChatMessage = {
          id: thinkingId,
          role: "assistant",
          content: "",
          thinkingSteps: [],
        };
        setMessages((prev) => [...prev, thinkingMsg]);

        thinkingSteps.forEach((step, i) => {
          setTimeout(() => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === thinkingId
                  ? { ...m, thinkingSteps: thinkingSteps.slice(0, i + 1) }
                  : m
              )
            );
          }, (i + 1) * stepDelay);
        });

        setTimeout(() => {
          if (brand) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === thinkingId
                  ? {
                      ...m,
                      content: `Here are the top optimization moves for ${brandName}, ranked by expected impact.`,
                      performanceSnapshot: {
                        title: `${brandName} — Optimization Moves`,
                        period: "May 2026",
                        metrics: [
                          {
                            label: "Shift 15% of Meta spend to Google Shopping",
                            value: "Shopping ROAS 6.9x vs Meta 3.8x",
                            change: { direction: "up" as const, text: "+$2.1K/mo" },
                            context: "High confidence — 30 days of data",
                          },
                          {
                            label: "Pause TikTok prospecting → retargeting",
                            value: "TikTok CPA $33 vs retargeting $18-22",
                            change: { direction: "down" as const, text: "-38% CPA" },
                            context: "Medium confidence — small sample",
                          },
                          {
                            label: "Refresh top Meta ad creative",
                            value: "Frequency 3.2, CTR dropped 12% this week",
                            change: { direction: "down" as const, text: "-12% CTR" },
                            context: "High confidence — 18 days running",
                          },
                          {
                            label: "Test branded search on Bing",
                            value: "Google branded CPA $7, Bing 30-40% cheaper",
                            context: "Low confidence — no historical data",
                          },
                        ],
                      },
                    }
                  : m
              )
            );
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === thinkingId
                  ? {
                      ...m,
                      content: `Here are optimization moves for ${brandName}:\n\n1. **Review channel allocation.** Shift budget toward your highest-ROAS channels.\n2. **Check creative freshness.** Ads running 14+ days at high frequency may need new variants.\n3. **Expand retargeting.** Reallocating 15-20% from prospecting to retargeting often improves CPA.`,
                    }
                  : m
              )
            );
          }
          setIsLoading(false);
        }, thinkingSteps.length * stepDelay + 800);
        return;
      }

      // Normal API chat
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      const updatedMessages = [...messagesRef.current, userMsg];
      callAPI(updatedMessages).then(
        (response: { text: string; toolCall: { name: string; input: Record<string, string> } | null }) => {
          setIsLoading(false);

          if (response.toolCall?.name === "build_campaign_plan") {
            const input = response.toolCall.input;
            const intent: CampaignIntent = {
              objective: input.objective,
              audience: input.audience || undefined,
              budget: input.budget || undefined,
            };

            const plan = buildPlanFromIntent(intent);
            setActivePlan(plan);

            const textMsg: ChatMessage = {
              id: nextId(),
              role: "assistant",
              content: response.text || getAcknowledgment(intent),
            };
            const planMsg: ChatMessage = {
              id: nextId(),
              role: "assistant",
              content:
                "Here's your media plan. Each section shows its readiness state — review the details, edit anything, and send for approval when ready.",
              artifact: plan,
            };
            setMessages((prev) => [...prev, textMsg, planMsg]);
          } else {
            // Keep the conversation moving — append a next-step menu so a generic
            // reply (incl. one reached from a prior next-step pick) isn't a dead end.
            setMessages((prev) => [...prev, ...answerWithNextSteps(response.text, content)]);
          }
        }
      );
    },
    [strategyIntent, campaignIntent, evaluateStrategyFlow, evaluateAndRespond, callAPI, setActivePlan, saveNarrative, setActiveNarrative, collapseLeftRail, advertiser, setAdvertiser, chatMode, setChatMode, setActiveStrategy, saveStrategy]
  );

  // Continue campaign flow AFTER mode is chosen (or when mode is already known)
  const continueCampaignFlow = useCallback((mode: ChatMode) => {
    // Auto-infer advertiser from brand profile if known
    if (!brandRef.current) brandRef.current = getCurrentBrand();
    const brand = brandRef.current;
    let hasAdv = !!advertiser;

    if (!hasAdv && brand) {
      const inferred = {
        id: `adv-${Date.now()}`,
        companyName: brand.name,
        websiteUrl: brand.domain,
        industry: mapBrandIndustryToIAB(brand.industry),
        restrictedCategories: [] as IABRestrictedCategory[],
      };
      setAdvertiser(inferred);
      hasAdv = true;
    }

    const intent: StrategyIntent = {};
    if (brand && hasAdv) {
      intent.advertiserSetup = {
        companyName: brand.name,
        websiteUrl: brand.domain,
        industry: mapBrandIndustryToIAB(brand.industry),
        restrictedCategories: [],
      };
    }

    // EXPRESS MODE: Skip guided steps, build with defaults + progressive thinking
    if (mode === "express") {
      const directIntent: StrategyIntent = {
        ...intent,
        objective: "sales",
        selectedKeywords: [],
        allKeywords: [],
      };

      const adv = advertiser || {
        id: `adv-${Date.now()}`,
        companyName: brand?.name || "Company",
        websiteUrl: brand?.domain || "example.com",
        industry: (brand ? mapBrandIndustryToIAB(brand.industry) : "other") as IABIndustry,
        restrictedCategories: [] as IABRestrictedCategory[],
      };

      if (!advertiser && brand) {
        setAdvertiser(adv);
      }

      setIsLoading(true);
      const advName = adv.companyName;
      const thinkingSteps = [
        `Setting up sales campaign for ${advName}`,
        "Applying smart defaults for targeting and placements",
        "Allocating budget across recommended channels",
        "Generating forecast and confidence scores",
        "Assembling your media plan",
      ];

      const stepDelay = 500;
      const thinkingId = nextId();
      const thinkingMsg: ChatMessage = {
        id: thinkingId,
        role: "assistant",
        content: "",
        thinkingSteps: [],
      };
      setMessages((prev) => [...prev, thinkingMsg]);

      thinkingSteps.forEach((step, i) => {
        setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === thinkingId
                ? { ...m, thinkingSteps: thinkingSteps.slice(0, i + 1) }
                : m
            )
          );
        }, (i + 1) * stepDelay);
      });

      setTimeout(() => {
        const strategy = buildStrategyFromIntent(directIntent, adv);
        strategy.keywords = [];
        setActiveStrategy(strategy);
        saveStrategy(strategy);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingId
              ? {
                  ...m,
                  content: brand
                    ? `Built a sales campaign for ${brand.name} with recommended defaults. Review and edit on the canvas.`
                    : "Built a campaign with recommended defaults. Review and edit on the canvas.",
                }
              : m
          )
        );
        setIsLoading(false);
        setState(autoArtifactLayout());
        collapseLeftRail();
      }, thinkingSteps.length * stepDelay + 500);
      return;
    }

    // GUIDED MODE: Walk through step by step
    setStrategyIntent(intent);

    const aiMsg: ChatMessage = {
      id: nextId(),
      role: "assistant",
      content: brand
        ? `Great — I'll walk you through it. I've looked at ${brand.domain} — ${brand.industry.toLowerCase()}, ${brand.tagline.toLowerCase().replace(/\.$/, "")}. Let's build a campaign for ${brand.name}.`
        : "Great — let's build your campaign step by step.",
    };

    const nextTool = getNextStrategyTool(intent, hasAdv);
    if (nextTool) {
      const toolMsg: ChatMessage = {
        id: nextId(),
        role: "assistant",
        content: "",
        toolCall: strategyToolToToolCall(nextTool),
      };
      setMessages((prev) => [...prev, aiMsg, toolMsg]);
    } else {
      setMessages((prev) => [...prev, aiMsg]);
    }
  }, [advertiser, setAdvertiser, setActiveStrategy, saveStrategy, collapseLeftRail]);

  const submitChoice = useCallback(
    (msgId: string, field: string, selected: string[]) => {
      const resolved = resolveChoice(field as keyof CampaignIntent, selected);
      const label = selected
        .map((id) => {
          const msg = messages.find((m) => m.id === msgId);
          if (msg?.toolCall?.type === "choices") {
            const opt = msg.toolCall.options.find((o: ChoiceOption) => o.id === id);
            return opt?.label || id;
          }
          return id;
        })
        .join(", ");

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, toolCall: undefined } : m
        )
      );

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content: label,
      };

      // Route to correct flow

      // First-time mode preference
      if (field === "setup-mode") {
        const selectedId = selected[0];
        const chosenMode: ChatMode = selectedId === "express" ? "express" : "plan";
        setChatMode(chosenMode);
        setMessages((prev) => [...prev, userMsg]);
        // Continue the campaign flow with the chosen mode
        continueCampaignFlow(chosenMode);
        return;
      }

      // In-flight optimization suggestion (contextual chat starter on an active
      // plan) — apply the budget shift, explain, or dismiss.
      if (field === "inflight-suggestion") {
        const sel = selected[0];
        setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, toolCall: undefined } : m)));
        const plan = activeMediaPlanRef.current;
        const inf = plan ? getPlanInflight(plan) : null;
        const s = inf?.suggestion;
        const clean = (x: string) => x.replace(/\s*\(.+\)\s*$/, "");
        const f = (n: number) => `$${Math.round(n).toLocaleString()}`;
        let reply = "";
        if (sel === "apply" && plan && s) {
          const from = plan.campaigns.find((c) => c.id === s.fromId);
          const to = plan.campaigns.find((c) => c.id === s.toId);
          const move = Math.min(s.amount, from?.budget ?? 0);
          let p = editCampaignBudget(plan, s.toId, (to?.budget ?? 0) + move);
          p = editCampaignBudget(p, s.fromId, (from?.budget ?? 0) - move);
          const np = { ...p, aiTouched: [s.fromId, s.toId] };
          setActiveMediaPlan(np); saveMediaPlan(np);
          reply = `Done — moved ${f(move)} from ${clean(s.fromLabel)} to ${clean(s.toLabel)}. Now forecasting **${np.summary.estConversions.toLocaleString()} conversions** at **${np.summary.estRoas}× ROAS**. It's on the canvas, and reversible — say the word to undo.`;
        } else if (sel === "why" && s) {
          reply = `${clean(s.fromLabel)} is converting at ${s.fromRoas.toFixed(1)}× — the lowest in the plan — while ${clean(s.toLabel)} is at ${s.toRoas.toFixed(1)}×. Moving spend toward the stronger performer lifts blended ROAS without changing the total budget. Want me to apply it?`;
        } else {
          reply = "No problem — I'll keep watching pacing and flag it again if the gap widens.";
        }
        setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: reply }]);
        return;
      }

      // Next-step menu after an answer — send the chosen option as a normal
      // message so it routes through the same flows (analytical guard,
      // competitive intent, etc.). sendMessage appends the user message itself.
      if (field === "next-step") {
        setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, toolCall: undefined } : m)));
        sendMessage(label);
        return;
      }

      // One-click sample brief — send it as a normal message so the awaiting-brief
      // handler builds it (reliable demo path, no typing required).
      if (field === "media-plan-sample") {
        setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, toolCall: undefined } : m)));
        const brand = brandRef.current || getCurrentBrand();
        sendMessage(sampleBriefFor(brand?.name || "this client"));
        return;
      }

      // Agency media-plan build mode: conversation vs set-it-up-yourself (GUI).
      if (field === "media-plan-mode") {
        const selectedId = selected[0];
        setMessages((prev) => [...prev, userMsg]);
        const brand = brandRef.current || getCurrentBrand();
        const adv = brand
          ? {
              id: `adv-${brand.domain.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
              companyName: brand.name,
              websiteUrl: brand.domain,
              industry: mapBrandIndustryToIAB(brand.industry),
              restrictedCategories: [],
            }
          : { id: "adv-fallback", companyName: "Your client", websiteUrl: "your-site.com", industry: mapBrandIndustryToIAB("other"), restrictedCategories: [] };

        if (selectedId === "myself") {
          // "I know what I want" === Express mode: keep the visible ChatMode in
          // sync, then drop the prefilled plan on the canvas (you tweak / accept).
          setChatMode("express");
          const plan = { ...buildMediaPlan(adv, "plan", 0, undefined, getActiveClient()?.id), chatSessionId: currentSessionIdRef.current ?? undefined };
          saveMediaPlan(plan);
          setActiveMediaPlan(plan);
          setState("resting"); // collapse chat to bubble; canvas shows the plan
          return;
        }

        // "Help me think it through" === Plan mode: walk the brief → clarify → build.
        setChatMode("plan");
        mediaPlanFlowRef.current = { stage: "awaiting-brief", brief: "" };
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: `Great — paste the client brief (goal, budget, audience, timeline) and I'll pull in ${adv.companyName}'s account data and build it. Or use a sample to see it in action:`,
          },
          sampleBriefCard(),
        ]);
        return;
      }

      if (field === "post-performance" || field === "post-connect") {
        // Follow-up action cards → route to the right flow
        const selectedId = selected[0];
        setMessages((prev) => [...prev, userMsg]);

        if (selectedId === "campaign-plan" || selectedId === "build-campaign") {
          // Route through sendMessage which will detect campaign intent
          setTimeout(() => sendMessage("Build me a campaign"), 100);
        } else if (selectedId === "view-performance") {
          setTimeout(() => sendMessage("Show me how my marketing is performing"), 100);
        } else if (selectedId === "build-audiences") {
          // Open the audience builder the label promises (was falling through to
          // a generic reply that opened nothing).
          setTimeout(() => sendMessage("Build me an audience"), 100);
        } else {
          // Generic — send through API for natural response
          setIsLoading(true);
          const allMsgs = [...messagesRef.current, userMsg];
          callAPI(allMsgs).then(
            (response: { text: string; toolCall: { name: string; input: Record<string, string> } | null }) => {
              setIsLoading(false);
              const aiMsg: ChatMessage = {
                id: nextId(),
                role: "assistant",
                content: response.text || "Let me pull that together for you.",
              };
              setMessages((prev) => [...prev, aiMsg]);
            }
          );
        }
        return;
      } else if (field === "budget-direct") {
        // Budget picked directly (the spend-planning flow). Resolve the amount —
        // a preset label, or the custom dollar value routed in via onCustomValue —
        // and show the allocation. Without this the pick fell through to the legacy
        // objective flow and the chosen budget was silently lost.
        const brand = brandRef.current;
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);
        setTimeout(() => {
          setIsLoading(false);
          const aiMsg: ChatMessage = brand
            ? {
                id: nextId(),
                role: "assistant",
                content: `Got it — ${label} for ${brand.name}. Here's a starting allocation across the best channels. It's a draft pacing plan — I'll tune it as performance data comes in.`,
                performanceSnapshot: {
                  title: `${brand.name} — Monthly Allocation`,
                  period: label,
                  metrics: [
                    { label: "Google Shopping", value: "45% of budget", context: "Highest-ROAS channel for DTC" },
                    { label: "Meta retargeting", value: "30%", context: "Re-engage site visitors and past purchasers" },
                    { label: "Meta prospecting", value: "20%", context: "Lookalike audiences from your customer list" },
                    { label: "Brand search", value: "5%", context: "Protect branded terms, low CPC" },
                  ],
                },
              }
            : {
                id: nextId(),
                role: "assistant",
                content: `Got it — ${label}. I'll set up a pacing plan across your channels.`,
              };
          const nextMsg: ChatMessage = {
            id: nextId(),
            role: "assistant",
            content: "",
            toolCall: {
              type: "choices",
              field: "post-connect",
              question: "What's next?",
              step: 1,
              totalSteps: 1,
              multiSelect: false,
              options: [
                { id: "build-campaign", label: "Build a campaign", detail: "Create a campaign around this allocation" },
                { id: "view-performance", label: "View performance first", detail: "See current metrics before planning" },
              ],
            },
          };
          setMessages((prev) => [...prev, aiMsg]);
          setTimeout(() => setMessages((prev) => [...prev, nextMsg]), 400);
        }, 600);
        return;
      } else if (field === "budget-range") {
        // Budget selected → show allocation plan
        const brand = brandRef.current;
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);

        setTimeout(() => {
          setIsLoading(false);
          const aiMsg: ChatMessage = brand
            ? {
                id: nextId(),
                role: "assistant",
                content: `Got it — ${label} monthly. Here's a starting allocation for ${brand.name}. This is a draft pacing plan — I'll adjust as performance data comes in.`,
                performanceSnapshot: {
                  title: `${brand.name} — Monthly Allocation`,
                  period: label,
                  metrics: [
                    { label: "Google Shopping", value: "45% of budget", context: "Highest ROAS channel for DTC fragrance" },
                    { label: "Meta retargeting", value: "30%", context: "Re-engage site visitors and past purchasers" },
                    { label: "Meta prospecting", value: "20%", context: "Lookalike audiences from your customer list" },
                    { label: "Brand search", value: "5%", context: "Protect branded terms, low CPC" },
                  ],
                },
              }
            : {
                id: nextId(),
                role: "assistant",
                content: `Got it — ${label} monthly. I'll set up a pacing plan across your platforms.`,
              };
          const nextMsg: ChatMessage = {
            id: nextId(),
            role: "assistant",
            content: "",
            toolCall: {
              type: "choices",
              field: "post-connect",
              question: "What's next?",
              step: 1,
              totalSteps: 1,
              multiSelect: false,
              options: [
                { id: "build-campaign", label: "Build a campaign", detail: "Create a campaign around this allocation" },
                { id: "view-performance", label: "View performance first", detail: "See current metrics before planning" },
              ],
            },
          };
          setMessages((prev) => [...prev, aiMsg]);
          setTimeout(() => {
            setMessages((prev) => [...prev, nextMsg]);
          }, 400);
        }, 600);
        return;
      } else if (field === "audience-type") {
        const brand = brandRef.current;
        const brandName = brand?.name || "your brand";
        const audienceType = selected[0] as AudienceSegmentType;
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);

        const typeLabels: Record<string, string> = {
          retargeting: "Site Visitors — Last 30 Days",
          lookalike: "Lookalike — Top Customers",
          "customer-list": "Customer List Upload",
          interest: "Interest-based Targeting",
        };

        const rulesMap: Record<string, { label: string; value: string; source: "user_input" | "ai_inferred" }[]> = {
          retargeting: [
            { label: "Source", value: "Website visitors", source: "user_input" },
            { label: "Lookback window", value: "Last 30 days", source: "ai_inferred" },
            { label: "Exclude", value: "Existing customers (purchased in last 90 days)", source: "ai_inferred" },
            { label: "Min page views", value: "2+ pages visited", source: "ai_inferred" },
          ],
          lookalike: [
            { label: "Seed audience", value: "Top 20% customers by LTV", source: "ai_inferred" },
            { label: "Similarity", value: "1-3% lookalike expansion", source: "ai_inferred" },
            { label: "Geography", value: "Same markets as seed audience", source: "ai_inferred" },
            { label: "Exclude", value: "Existing customers and recent site visitors", source: "ai_inferred" },
          ],
          "customer-list": [
            { label: "Source", value: "Customer email list", source: "user_input" },
            { label: "Match type", value: "Email + phone hashed match", source: "ai_inferred" },
            { label: "Refresh", value: "Syncs daily from CRM", source: "ai_inferred" },
          ],
          interest: [
            { label: "Interests", value: "Luxury goods, natural beauty, artisan products", source: "ai_inferred" },
            { label: "Demographics", value: "25-54, high household income", source: "ai_inferred" },
            { label: "Behaviors", value: "Online shoppers, DTC brand buyers", source: "ai_inferred" },
          ],
        };

        const sizeMap: Record<string, string> = {
          retargeting: "18,400 - 22,100",
          lookalike: "340,000 - 520,000",
          "customer-list": "8,200 - 9,500",
          interest: "1.2M - 2.4M",
        };

        setTimeout(() => {
          setIsLoading(false);

          const segment: AudienceSegment = {
            id: `aud-${Date.now()}`,
            name: `${brandName} — ${typeLabels[audienceType] || label}`,
            type: audienceType,
            status: "draft",
            advertiserId: brand?.name || "Unknown",
            estimatedSize: sizeMap[audienceType] || "Unknown",
            rules: (rulesMap[audienceType] || []).map((r) => ({
              label: r.label,
              value: r.value,
              provenance: { source: r.source, reasoning: `Inferred for ${brandName} ${audienceType} audience` },
            })),
            platforms: ["Meta", "Google", "TikTok"],
            createdAt: new Date().toISOString(),
            lastModifiedAt: new Date().toISOString(),
          };

          setActiveAudience(segment);

          const ackMsg: ChatMessage = {
            id: nextId(),
            role: "assistant",
            content: `Built a ${label.toLowerCase()} segment for ${brandName}. Your audience is on the canvas — review the targeting rules, edit anything, then save when ready.`,
          };
          setMessages((prev) => [...prev, ackMsg]);

          setState(autoArtifactLayout());
          collapseLeftRail();
        }, 800);
        return;
      } else if (strategyIntent) {
        const updated: StrategyIntent = { ...strategyIntent, [field]: resolved };
        evaluateStrategyFlow(updated, userMsg);
      } else {
        const updated = mergeIntent(campaignIntent || {}, {
          [field]: resolved,
        } as CampaignIntent);
        evaluateAndRespond(updated, userMsg);
      }
    },
    [strategyIntent, campaignIntent, messages, evaluateStrategyFlow, evaluateAndRespond, sendMessage, callAPI, setActiveAudience, collapseLeftRail, continueCampaignFlow, setChatMode]
  );

  const skipChoice = useCallback(
    (msgId: string, field: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, toolCall: undefined } : m
        )
      );

      // Real strategy-flow steps are skippable by ADVANCING with a sensible
      // default — never by re-rendering the same card forever (the old
      // keyword-skip loop, where Skip set nothing so getNextStrategyTool kept
      // re-asking). objective/advertiser had the same latent loop.
      if (strategyIntent && (field === "selectedKeywords" || field === "objective" || field === "advertiserSetup")) {
        const advance: StrategyIntent = { ...strategyIntent };
        let what = field;
        if (field === "selectedKeywords") { advance.selectedKeywords = []; advance.allKeywords = []; what = "keywords"; }
        if (field === "objective") { advance.objective = strategyIntent.objective || "sales"; what = "objective"; }
        if (field === "advertiserSetup" && !advance.advertiserSetup?.companyName) {
          const brand = brandRef.current || getCurrentBrand();
          advance.advertiserSetup = brand
            ? { companyName: brand.name, websiteUrl: brand.domain, industry: mapBrandIndustryToIAB(brand.industry), restrictedCategories: [] }
            : { companyName: "Company", websiteUrl: "example.com", industry: "other", restrictedCategories: [] };
          what = "advertiser setup";
        }
        const userMsg: ChatMessage = { id: nextId(), role: "user", content: `Skipped ${what}` };
        evaluateStrategyFlow(advance, userMsg);
        return;
      }

      // Contextual / informational cards are NOT part of any build flow — skipping
      // them dismisses with a short acknowledgment and never kicks off the legacy
      // "What's the goal?" objective flow (the old "Skip launches the wrong builder").
      const NON_FLOW_FIELDS = [
        "inflight-suggestion", "next-step", "media-plan-sample",
        "audience-type", "budget-direct", "budget-range",
        "media-plan-mode", "setup-mode", "post-connect", "post-performance",
      ];
      if (NON_FLOW_FIELDS.includes(field)) {
        if (field === "inflight-suggestion") {
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "assistant", content: "No problem — I'll keep watching pacing and flag it again if the gap widens." },
          ]);
        } else if (field === "media-plan-sample") {
          // Stop waiting for a brief so a later casual message isn't silently
          // swallowed as the brief.
          mediaPlanFlowRef.current = { stage: "idle", brief: "" };
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "assistant", content: "No problem — paste the brief whenever you're ready and I'll build the plan." },
          ]);
        } else if (field !== "next-step") {
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "assistant", content: "No problem — tell me what you'd like to do instead." },
          ]);
        }
        return;
      }

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content: `Skipped ${field}`,
      };

      if (strategyIntent) {
        evaluateStrategyFlow({ ...strategyIntent }, userMsg);
      } else {
        const updated = mergeIntent(campaignIntent || {}, {} as CampaignIntent);
        evaluateAndRespond(updated, userMsg);
      }
    },
    [strategyIntent, campaignIntent, evaluateStrategyFlow, evaluateAndRespond]
  );

  const submitAdvertiserSetup = useCallback(
    (msgId: string, data: {
      companyName: string;
      websiteUrl: string;
      industry: IABIndustry;
      restrictedCategories: IABRestrictedCategory[];
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, toolCall: undefined } : m
        )
      );

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content: `${data.companyName} · ${data.websiteUrl}`,
      };

      const updated: StrategyIntent = {
        ...strategyIntent,
        advertiserSetup: data,
      };

      evaluateStrategyFlow(updated, userMsg);
    },
    [strategyIntent, evaluateStrategyFlow]
  );

  const submitKeywords = useCallback(
    (msgId: string, selectedKeywordIds: string[], allKeywords: KeywordChip[]) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, toolCall: undefined } : m
        )
      );

      const selectedLabels = allKeywords
        .filter((k) => selectedKeywordIds.includes(k.id))
        .map((k) => k.label)
        .slice(0, 3);
      const label = selectedLabels.join(", ") + (selectedKeywordIds.length > 3 ? ` +${selectedKeywordIds.length - 3} more` : "");

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content: label || "Keywords selected",
      };

      const updated: StrategyIntent = {
        ...strategyIntent,
        selectedKeywords: selectedKeywordIds,
        allKeywords,
      };

      evaluateStrategyFlow(updated, userMsg);
    },
    [strategyIntent, evaluateStrategyFlow]
  );

  // Handle platform connection card "Continue" after all accounts are connected
  const submitPlatformConnection = useCallback(
    (msgId: string, connectedIds: string[], intentTag: string) => {
      // Clear the connection card
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, toolCall: undefined } : m
        )
      );

      const brand = brandRef.current;
      const brandName = brand?.name || "your accounts";
      const platformCount = connectedIds.length;

      // Look up platform labels
      const platformLabels = connectedIds.map((id) => {
        const labelMap: Record<string, string> = {
          "google-ads": "Google Ads",
          "meta-ads": "Meta Ads",
          "tiktok-ads": "TikTok Ads",
          "linkedin-ads": "LinkedIn Ads",
          shopify: "Shopify",
          ga4: "GA4",
        };
        return labelMap[id] || id;
      });
      const label = platformLabels.join(", ");

      if (intentTag === "connect") {
        const aiMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: `All set — ${label} ${platformCount > 1 ? "are" : "is"} connected. Data is syncing now — ${brandName}'s last 90 days of performance will be ready in about 2 minutes.`,
        };
        const nextStepMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: "",
          toolCall: {
            type: "choices",
            field: "post-connect",
            question: "What would you like to do next?",
            step: 1,
            totalSteps: 1,
            multiSelect: false,
            options: [
              { id: "view-performance", label: "View performance", detail: "See how your campaigns are doing" },
              { id: "build-campaign", label: "Build a campaign", detail: "Create a new campaign with AI guidance" },
              { id: "build-audiences", label: "Build audiences", detail: "Retarget site visitors or create lookalikes" },
            ],
          },
        };
        setMessages((prev) => [...prev, aiMsg]);
        setTimeout(() => {
          setMessages((prev) => [...prev, nextStepMsg]);
        }, 400);
      } else if (intentTag === "budget") {
        const toolMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: "",
          toolCall: {
            type: "choices",
            field: "budget-range",
            question: "What's your monthly budget?",
            subtitle: `We'll allocate across ${label}.`,
            step: 1,
            totalSteps: 1,
            multiSelect: false,
            options: [
              { id: "under-5k", label: "Under $5,000", detail: "Starter budget — focus on 1–2 channels" },
              { id: "5k-15k", label: "$5,000 – $15,000", detail: "Growth budget — test across channels" },
              { id: "15k-50k", label: "$15,000 – $50,000", detail: "Scale budget — optimize aggressively" },
              { id: "over-50k", label: "$50,000+", detail: "Enterprise — full channel coverage" },
              { id: "custom", label: "Custom amount" },
            ],
          },
        };
        setMessages((prev) => [...prev, toolMsg]);
      } else {
        // Performance → build narrative and open on canvas (same as direct performance intent)
        setIsLoading(true);
        setTimeout(() => {
          setIsLoading(false);
          try {
            const perfData = brand?.domain === "ffern.co" ? FFERN_SEED_PERFORMANCE : SEED_PERFORMANCE;
            const anomalyData = brand?.domain === "ffern.co" ? FFERN_SEED_ANOMALIES : SEED_ANOMALIES;
            const period = { month: 5, year: 2026 };
            const narrative = buildNarrativeFromSeed(perfData, anomalyData, period);
            if (brand) {
              narrative.name = `${brand.name} — May 2026 Performance`;
              narrative.advertiserId = brand.name;
            }
            saveNarrative(narrative);
            setActiveNarrative(narrative);

            const ackMsg: ChatMessage = {
              id: nextId(),
              role: "assistant",
              content: brand
                ? `${label} connected — here's ${brand.name}'s performance for the last 30 days. Spend, attribution, changes, and recommended moves on the canvas.`
                : `Connected. Here's your performance overview for May 2026. Review each section on the canvas.`,
            };
            setMessages((prev) => [...prev, ackMsg]);

            setState(autoArtifactLayout());
            collapseLeftRail();
          } catch {
            const errMsg: ChatMessage = {
              id: nextId(),
              role: "assistant",
              content: "Connected, but couldn't generate the performance view — no data for that period.",
            };
            setMessages((prev) => [...prev, errMsg]);
          }
        }, 800);
      }
    },
    [saveNarrative, setActiveNarrative, collapseLeftRail]
  );

  // Continue campaign flow AFTER mode is chosen (or when mode is already known)
  // Start the NEW strategy-based campaign flow
  const startCampaignFlow = useCallback(() => {
    // Open in the user's explicit entry layout (fullscreen by default)
    setState(readEntryLayout());
    setMessages([]);

    // Check if user has explicitly chosen a mode before
    const savedMode = typeof window !== "undefined"
      ? localStorage.getItem("fuseiq-chat-mode") as ChatMode | null
      : null;

    if (!savedMode) {
      // FIRST TIME — ask the user how they want to work
      if (!brandRef.current) brandRef.current = getCurrentBrand();
      const brand = brandRef.current;
      const brandIntro = brand
        ? `I can build a campaign for ${brand.name}. Do you already know what you want, or should we think it through together?`
        : "I can help you build a campaign. Do you already know what you want, or should we think it through together?";

      const introMsg: ChatMessage = {
        id: nextId(),
        role: "assistant",
        content: brandIntro,
      };

      const modeChoiceMsg: ChatMessage = {
        id: nextId(),
        role: "assistant",
        content: "",
        toolCall: {
          type: "choices" as const,
          question: "How do you want to build it?",
          subtitle: "You're always in charge — tweak or accept either way.",
          field: "setup-mode",
          step: 1,
          totalSteps: 1,
          options: [
            { id: "guided", label: "Build it with me", detail: "I'll ask a few quick questions to get targeting, budget, and creative right." },
            { id: "express", label: "I'll set it up myself", detail: "I'll prefill the campaign on the canvas with smart defaults — change anything." },
          ],
          multiSelect: false,
        },
      };

      setMessages([introMsg, modeChoiceMsg]);
      return;
    }

    // Mode is already known — proceed directly
    continueCampaignFlow(savedMode);
  }, [continueCampaignFlow]);

  // Agency media-plan build: conversation-first, with an initial card to either
  // build it together or skip into the editable canvas (set it up yourself).
  const startMediaPlanFlow = useCallback(() => {
    setState(readEntryLayout());
    setMessages([]);
    if (!brandRef.current) brandRef.current = getCurrentBrand();
    const name = brandRef.current?.name || "this client";
    const intro: ChatMessage = {
      id: nextId(),
      role: "assistant",
      content: `Let's build a media plan for ${name}. Want to do it together, or set it up yourself?`,
    };
    const card: ChatMessage = {
      id: nextId(),
      role: "assistant",
      content: "",
      toolCall: {
        type: "choices" as const,
        question: "How do you want to build it?",
        subtitle: "You're always in charge — tweak or accept either way.",
        field: "media-plan-mode",
        step: 1,
        totalSteps: 1,
        multiSelect: false,
        options: [
          { id: "withme", label: "Build it with me", detail: `We'll shape it together using ${name}'s data and signals, then I prefill the plan.` },
          { id: "myself", label: "I'll set it up myself", detail: `I'll prefill a plan on the canvas from ${name}'s data — you take it from there.` },
        ],
      },
    };
    setMessages([intro, card]);
  }, [setState]);

  // Open a plan with a chat starter contextual to its current state — and, for a
  // live plan, surface the optimization suggestion in chat (not on the canvas).
  const openPlanContext = useCallback((plan: MediaPlan) => {
    const enabled = plan.campaigns.filter((c) => c.enabled).length;
    const f = (n: number) => `$${Math.round(n).toLocaleString()}`;
    const clean = (x: string) => x.replace(/\s*\(.+\)\s*$/, "");
    const statusLabel: Record<string, string> = {
      draft: "a draft", "pending-approval": "pending approval", approved: "approved — ready to activate",
      active: "live", paused: "paused", archived: "archived",
    };
    const lead = `You're in **${plan.name}** — ${statusLabel[plan.reviewState] ?? plan.reviewState}, ${f(plan.summary.totalBudget)} across ${enabled} ${enabled === 1 ? "channel" : "channels"}, ${plan.flight}.`;
    const msgs: ChatMessage[] = [];
    if (plan.reviewState === "active") {
      const inf = getPlanInflight(plan);
      msgs.push({ id: nextId(), role: "assistant", content: `${lead} It's **${inf.status.toLowerCase()}** — day ${inf.elapsedDays} of ${inf.totalDays}. Ask me to adjust budgets, shift between channels, or dig into pacing.` });
      if (inf.suggestion) {
        const s = inf.suggestion;
        msgs.push({ id: nextId(), role: "assistant", content: `One thing worth a look: **${clean(s.fromLabel)}** is your weakest at ${s.fromRoas.toFixed(1)}× ROAS, while **${clean(s.toLabel)}** is delivering ${s.toRoas.toFixed(1)}×. I can shift **${f(s.amount)}** to lift blended return.` });
        msgs.push({
          id: nextId(), role: "assistant", content: "",
          toolCall: {
            type: "choices", field: "inflight-suggestion", question: "Apply this optimization?",
            step: 1, totalSteps: 1, multiSelect: false,
            options: [
              { id: "apply", label: `Apply — shift ${f(s.amount)} to ${clean(s.toLabel)}` },
              { id: "not-now", label: "Not now" },
              { id: "why", label: "Why this shift?" },
            ],
          },
        });
      }
    } else {
      msgs.push({ id: nextId(), role: "assistant", content: `${lead} Tell me what to change — budget, a channel's spend, audiences, or the goal — or ask why the plan looks the way it does.` });
    }
    initNewSession(true);
    setMessages(msgs);
    setActiveMediaPlan(plan);
    setState(autoArtifactLayout());
    collapseLeftRail();
  }, [initNewSession, setActiveMediaPlan, setState, collapseLeftRail]);

  const openFullscreen = useCallback(
    (initialMessage?: string, opts?: { skipIntentRouting?: boolean }) => {
      if (initialMessage) {
        if (state !== "resting") {
          // Chat is already open — continue in the current conversation and layout
          setTimeout(() => sendMessage(initialMessage, undefined, opts), 0);
        } else {
          // Chat is closed — open a new session in the user's explicit entry layout
          setState(readEntryLayout());
          initNewSession(true);
          // "Act on this" / nudges pass skipIntentRouting so the prompt goes
          // straight to the conversational AI instead of misfiring a build flow.
          setTimeout(() => sendMessage(initialMessage, undefined, opts), 0);
        }
      } else {
        // No message — just open the chat in the user's explicit entry layout
        setState(readEntryLayout());
      }
    },
    [state, sendMessage, initNewSession, setState]
  );

  const minimize = useCallback(() => {
    // Return to the user's preferred docked layout (floating if they chose it).
    const preferred = typeof window !== "undefined" ? localStorage.getItem(ENTRY_LAYOUT_KEY) : null;
    if (preferred === "floating") {
      setState("floating");
    } else {
      setState(autoArtifactLayout());
      collapseLeftRail();
    }
  }, [collapseLeftRail, setState]);
  const close = useCallback(() => {
    // Closing also disarms point-and-select so the canvas doesn't stay in
    // "click to attach" mode with no chat surface to receive the selection.
    setSelectMode(false);
    setPendingContext(null);
    setState("resting");
  }, [setState]);
  const expand = useCallback(() => setState("fullscreen"), [setState]);
  // Reopen the chat from the bubble — restore it to EXACTLY how it was before it
  // was minimized (split → split, floating → floating, fullscreen → fullscreen),
  // not a generic floating default.
  const reopenChat = useCallback(() => {
    const prev = lastVisibleLayoutRef.current;
    setState(prev);
    if (prev === "split") collapseLeftRail();
  }, [setState, collapseLeftRail]);
  const toggleDockSide = useCallback(
    () => {
      setDockSideRaw((prev) => {
        const next = prev === "right" ? "left" : "right";
        if (typeof window !== "undefined") localStorage.setItem("fuseiq-dock-side", next);
        return next;
      });
    },
    []
  );

  // --- Chat session management ---
  // Switching conversations keeps the user in their CURRENT layout
  // (floating / split / fullscreen). Only when the chat is closed (resting) does
  // it open in their preferred entry layout — you can't "stay" in a mode you're
  // not in.
  const layoutForConversationSwitch = useCallback(
    () => (state === "resting" ? readEntryLayout() : state),
    [state]
  );

  const startNewChat = useCallback(() => {
    initNewSession();
    setState(layoutForConversationSwitch());
  }, [initNewSession, layoutForConversationSwitch, setState]);

  const loadChatSessionById = useCallback(
    (sessionId: string) => {
      const sessions = loadChatSessions();
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;

      setCurrentSessionId(sessionId);
      setMessages(
        session.messages.map((m) => ({
          id: nextId(),
          role: m.role,
          content: m.content,
        }))
      );
      setCampaignIntent(null);
      setStrategyIntent(null);
      // Clean canvas for the new conversation, then reopen the plan it built (if
      // any) — so the artifact returns consistently from every entry point, not
      // just the left rail.
      clearAllArtifacts();
      const plan = savedMediaPlans?.find((p) => p.chatSessionId === sessionId);
      if (plan) setActiveMediaPlan(plan);
      setState(layoutForConversationSwitch());
    },
    [clearAllArtifacts, savedMediaPlans, setActiveMediaPlan, layoutForConversationSwitch, setState]
  );

  const handleRenameChatSession = useCallback(
    (sessionId: string, name: string) => {
      renameSessionInStorage(sessionId, name);
      setChatSessions(loadChatSessionMetas());
    },
    []
  );

  const handleArchiveChatSession = useCallback(
    (sessionId: string) => {
      archiveSessionInStorage(sessionId);
      setChatSessions(loadChatSessionMetas());
    },
    []
  );

  const handleDeleteChatSession = useCallback(
    (sessionId: string) => {
      deleteSessionFromStorage(sessionId);
      setChatSessions(loadChatSessionMetas());
      // If we deleted the active session, start fresh
      if (sessionId === currentSessionId) {
        initNewSession();
      }
    },
    [currentSessionId, initNewSession]
  );

  return (
    <AICompanionContext.Provider
      value={{
        state,
        setState,
        setEntryLayout,
        dockSide,
        chatMode,
        setChatMode,
        detailLevel,
        setDetailLevel,
        messages,
        isLoading,
        openFullscreen,
        startCampaignFlow,
        startMediaPlanFlow,
        openPlanContext,
        minimize,
        close,
        expand,
        reopenChat,
        setDockSide,
        toggleDockSide,
        sendMessage,
        pendingContext,
        setPendingContext,
        selectMode,
        setSelectMode,
        submitChoice,
        skipChoice,
        submitAdvertiserSetup,
        submitKeywords,
        submitPlatformConnection,
        currentSessionId,
        chatSessions,
        startNewChat,
        loadChatSession: loadChatSessionById,
        renameChatSession: handleRenameChatSession,
        archiveChatSession: handleArchiveChatSession,
        deleteChatSession: handleDeleteChatSession,
      }}
    >
      {children}
    </AICompanionContext.Provider>
  );
}

function strategyToolToToolCall(tool: StrategyFlowTool): ToolCall {
  if (tool.type === "choices") {
    return {
      type: "choices",
      field: tool.field,
      question: tool.question,
      subtitle: tool.subtitle,
      step: tool.step,
      totalSteps: tool.totalSteps,
      options: tool.options,
    };
  }
  if (tool.type === "advertiser-setup") {
    return {
      type: "advertiser-setup",
      field: "advertiserSetup",
      question: tool.question,
      step: tool.step,
      totalSteps: tool.totalSteps,
    };
  }
  return {
    type: "keywords",
    field: "selectedKeywords",
    question: tool.question,
    step: tool.step,
    totalSteps: tool.totalSteps,
    keywords: tool.keywords,
  };
}

export function useAICompanion() {
  const context = useContext(AICompanionContext);
  if (!context) {
    throw new Error(
      "useAICompanion must be used within an AICompanionProvider"
    );
  }
  return context;
}
