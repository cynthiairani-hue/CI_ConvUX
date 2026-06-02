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
import { buildMediaPlan, editCampaignBudget, toggleCampaign, setTotalBudget, parseMediaPlanCommand, WHY_CHANNEL } from "@/data/media-plan-flow";
import { getCapabilities } from "@/data/prerequisites";
import { getActiveClient } from "@/data/seed-agency";

export type AICompanionState = "resting" | "fullscreen" | "split" | "floating";
export type DockSide = "right" | "left";

/**
 * The layout the chat opens in when launched from an "outside" input bar
 * (any page input or CTA). Defaults to fullscreen and is ONLY changed by an
 * explicit user choice in the ChatLayoutPicker — never by automatic system
 * splits (e.g. auto-split on artifact). This keeps "type in the bar → fullscreen"
 * the default everywhere unless the user deliberately changes it.
 */
const ENTRY_LAYOUT_KEY = "fuseiq-entry-layout";
function readEntryLayout(): AICompanionState {
  // APP-WIDE RULE: every conversational launch (any CTA, any profile, any demo
  // mode) opens in FULLSCREEN. The user can re-dock afterward via the
  // ChatLayoutPicker, but launches are always fullscreen.
  return "fullscreen";
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
  openFullscreen: (initialMessage?: string) => void;
  startCampaignFlow: () => void;
  startMediaPlanFlow: () => void;
  minimize: () => void;
  close: () => void;
  expand: () => void;
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

export function AICompanionProvider({ children }: { children: ReactNode }) {
  const { activePersona } = usePersona();
  const { setActivePlan, advertiser, setAdvertiser, setActiveStrategy, saveStrategy, saveNarrative, setActiveNarrative, setActiveAudience, setActiveBrief, saveBrief, setActiveOperator, setActiveMediaPlan, saveMediaPlan, activeMediaPlan } = useCampaign();
  const { collapseLeftRail } = useLayout();
  // Defer localStorage reads to useEffect to prevent hydration mismatches
  const [state, setStateRaw] = useState<AICompanionState>("resting");
  useEffect(() => {
    const saved = localStorage.getItem("fuseiq-layout-state") as AICompanionState | null;
    if (saved === "split" || saved === "floating") setStateRaw(saved);
  }, []);
  const setState = useCallback((s: AICompanionState) => {
    setStateRaw(s);
    // Only persist active layout modes — "resting" is transient (chat closed),
    // not a layout preference. This way closing chat doesn't erase the user's
    // preferred layout (floating, split, fullscreen).
    if (typeof window !== "undefined" && s !== "resting") {
      localStorage.setItem("fuseiq-layout-state", s);
    }
  }, []);
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
          setState("split");
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

  // Media-plan flow: track when we're awaiting a pasted brief, and keep a live
  // ref to the active plan so refine actions (shift/why/activate) read fresh state.
  const mediaPlanFlowRef = useRef<{ stage: "idle" | "awaiting-brief"; brief: string }>({ stage: "idle", brief: "" });
  const activeMediaPlanRef = useRef<MediaPlan | null>(null);
  // Last channel the user edited via chat — lets pronouns ("change it to…") resolve.
  const lastEditedChannelRef = useRef<MediaChannelKey | null>(null);
  useEffect(() => {
    activeMediaPlanRef.current = activeMediaPlan;
  }, [activeMediaPlan]);

  const callAPI = useCallback(
    async (allMessages: ChatMessage[]) => {
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
      const brandContext = brand
        ? {
            name: brand.name,
            domain: brand.domain,
            industry: brand.industry,
            tagline: brand.tagline,
          }
        : undefined;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, brandContext, detailLevel: detailLevelRef.current, chatMode: chatModeRef.current }),
        });

        if (!res.ok) {
          return { text: "I can't process that right now. Try asking about performance, campaigns, budgets, or optimization — those work best.", toolCall: null };
        }

        return await res.json();
      } catch {
        return {
          text: "I can't process that right now. Try asking about performance, campaigns, budgets, or optimization — those work best.",
          toolCall: null,
        };
      }
    },
    []
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
        // Edit-shaped but unresolved (e.g. "make it bigger", no channel/amount): ask
        // rather than letting the language model fabricate a change it didn't make.
        const looksLikeEdit = /\b(change|set|shift|move|increase|decrease|raise|lower|cut|bump|budget|spend|reallocate)\b/.test(content.toLowerCase());
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
        mediaPlanFlowRef.current = { stage: "idle", brief: content };
        setMessages((prev) => [...prev, userMsg]);
        const brand = brandRef.current || getCurrentBrand();
        const brandName = brand?.name || "your brand";
        const dataCallout = getCapabilities().hasSitePixel
          ? `📊 **Found existing data for ${brandName}:** active pixel · I'll use the account's CPA history to personalise the forecast.`
          : `⚠️ **No pixel detected for ${brand?.domain || "the site"} yet** — I'll base projections on ${brandName}'s vertical benchmarks instead.`;
        const clarifyMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: `Got it — nice brief. Before I build the plan, two quick questions:\n\n1. Your brief mentions both acquisition and awareness. Should I weight the plan primarily toward conversions, or split more evenly between brand-building and direct response?\n2. The brief doesn't specify geography beyond "US" — are you open to testing Canada, or strictly US only?\n\n${dataCallout}`,
        };
        const choiceMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: "",
          toolCall: {
            type: "choices",
            field: "media-plan-clarify",
            question: "How should I weight the plan?",
            step: 1,
            totalSteps: 1,
            multiSelect: false,
            options: [
              { id: "conversions-us", label: "Conversions first, awareness secondary — US only" },
              { id: "even-split", label: "Even split between brand and conversion" },
              { id: "include-canada", label: "Include Canada too" },
            ],
          },
        };
        setMessages((prev) => [...prev, clarifyMsg, choiceMsg]);
        return;
      }

      // Skip intent routing when called from priority cards / proactive nudges —
      // these prompts should go straight to the conversational API, not get
      // caught by keyword-based intent detection (e.g. "spend" triggering budget flow).
      if (options?.skipIntentRouting) {
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);
        const updatedMessages = [...messagesRef.current, userMsg];
        callAPI(updatedMessages).then(
          (response: { text: string; toolCall: { name: string; input: Record<string, string> } | null }) => {
            setIsLoading(false);
            const aiMsg: ChatMessage = {
              id: nextId(),
              role: "assistant",
              content: response.text,
            };
            setMessages((prev) => [...prev, aiMsg]);
          }
        );
        return;
      }

      // ADVISE / RESEARCH MODE: don't enter the build flows. These modes
      // recommend and analyze — they answer conversationally with evidence
      // (the API disables the build_campaign_plan tool for these modes).
      if (chatMode === "advise" || chatMode === "research") {
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);
        const updatedMessages = [...messagesRef.current, userMsg];
        callAPI(updatedMessages).then(
          (response: { text: string; toolCall: { name: string; input: Record<string, string> } | null }) => {
            setIsLoading(false);
            const aiMsg: ChatMessage = {
              id: nextId(),
              role: "assistant",
              content: response.text,
            };
            setMessages((prev) => [...prev, aiMsg]);
          }
        );
        return;
      }

      // Check for campaign intent — route to strategy flow instead of API
      const lower = content.toLowerCase();

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
          setState("split");
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
          setState("split");
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
          const dataCallout = getCapabilities().hasSitePixel
            ? `📊 **Found existing data for ${brandName}:** active pixel · I'll use the account's CPA history to personalise the forecast.`
            : `⚠️ **No pixel detected for ${brand?.domain || "the site"} yet** — I'll base projections on ${brandName}'s vertical benchmarks instead.`;
          const clarifyMsg: ChatMessage = {
            id: nextId(),
            role: "assistant",
            content: `Got it — strong brief. One quick call before I build: should I weight the plan toward conversions, or split more evenly between brand-building and direct response?\n\n${dataCallout}`,
          };
          const choiceMsg: ChatMessage = {
            id: nextId(),
            role: "assistant",
            content: "",
            toolCall: {
              type: "choices",
              field: "media-plan-clarify",
              question: "How should I weight the plan?",
              step: 1,
              totalSteps: 1,
              multiSelect: false,
              options: [
                { id: "conversions-us", label: "Conversions first, awareness secondary — US only" },
                { id: "even-split", label: "Even split between brand and conversion" },
                { id: "include-canada", label: "Include Canada too" },
              ],
            },
          };
          setMessages((prev) => [...prev, clarifyMsg, choiceMsg]);
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
            setState("split");
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
            setState("split");
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

            setState("split");
            collapseLeftRail();
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

            setState("split");
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
            const aiMsg: ChatMessage = {
              id: nextId(),
              role: "assistant",
              content: response.text,
            };
            setMessages((prev) => [...prev, aiMsg]);
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
        setState("split");
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
          const plan = buildMediaPlan(adv, "plan", 0, undefined, getActiveClient()?.id);
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
            content: `Great — paste the client brief or describe the campaign (goal, budget, audience, timeline), and I'll pull in ${adv.companyName}'s account data, ask anything that's missing, then build it.`,
          },
        ]);
        return;
      }

      // The post-plan refine chips (Kirby's content, our pattern).
      const makeRefineCard = (): ChatMessage => ({
        id: nextId(),
        role: "assistant",
        content: "",
        toolCall: {
          type: "choices",
          field: "media-plan-refine",
          question: "Want to refine it?",
          step: 1,
          totalSteps: 1,
          multiSelect: false,
          options: [
            { id: "activate", label: "Looks great — send for approval" },
            { id: "shift-dooh-social", label: "Shift $10k from DOOH to social" },
            { id: "why-ctv", label: "Why CTV for a DTC brand?" },
            { id: "change-budget", label: "Change the budget" },
          ],
        },
      });

      if (field === "media-plan-clarify") {
        // Map the clarify answer to an objective; geography answer keeps conversions-led.
        const sel = selected[0] || "even-split";
        const objective = sel === "even-split" ? "awareness" : "sales";
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);
        const brand = brandRef.current || getCurrentBrand();
        const adv = advertiser || {
          id: "adv-fallback",
          companyName: brand?.name || "Your brand",
          websiteUrl: brand?.domain || "your site",
          industry: mapBrandIndustryToIAB(brand?.industry || "other"),
          restrictedCategories: [],
        };
        // Pull the brief's budget + goal so the plan is measured against what the
        // client actually asked for (honest target vs forecast).
        const brief = mediaPlanFlowRef.current.brief || "";
        const budgetMatch = brief.match(/\$\s?([\d][\d,]{3,})/);
        // No explicit brief budget ⇒ 0, so the active client's real monthly spend anchors it.
        const total = budgetMatch ? Number(budgetMatch[1].replace(/,/g, "")) : 0;
        const convMatch = brief.match(/([\d][\d,]{2,})\s*(?:new\s+)?(?:customer|acquisition|conversion)/i);
        const roasMatch = brief.match(/(\d+(?:\.\d+)?)\s*x\b/i) || brief.match(/roas[^\d]*(\d+(?:\.\d+)?)/i);
        const goal = {
          conversions: convMatch ? Number(convMatch[1].replace(/,/g, "")) : undefined,
          roas: roasMatch ? Number(roasMatch[1]) : undefined,
        };
        // Make it FEEL like the AI is working: stream realistic "gathering" steps
        // into a thinking block over ~4s, then reveal the plan. (No instant dump.)
        const thinkingMsg: ChatMessage = { id: nextId(), role: "assistant", content: "", thinkingSteps: [] };
        const thinkingId = thinkingMsg.id;
        setMessages((prev) => [...prev, thinkingMsg]);
        setIsLoading(false); // the thinking block's spinner is the activity indicator now

        const roasGoalLabel = goal.roas ? `${goal.roas}×` : "your target";
        const gatherSteps = [
          `Connecting to ${adv.companyName}'s ad accounts — Google, Meta, web pixel`,
          `Pulling the last 90 days of performance`,
          `Computing blended ROAS and CPA by channel`,
          `Benchmarking against the ${total > 0 ? `$${total.toLocaleString()}` : "monthly"} budget and ${roasGoalLabel} goal`,
          `Modeling channel allocation across the funnel`,
        ];

        let stepIdx = 0;
        const runStep = () => {
          if (stepIdx < gatherSteps.length) {
            const step = gatherSteps[stepIdx];
            stepIdx++;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === thinkingId ? { ...m, thinkingSteps: [...(m.thinkingSteps ?? []), step] } : m
              )
            );
            setTimeout(runStep, 850);
            return;
          }
          // Steps done — build and reveal.
          const plan = buildMediaPlan(adv, objective, total, goal, getActiveClient()?.id);
          setActiveMediaPlan(plan);
          saveMediaPlan(plan); // persist so it appears in the Media Plans list
          const conv = plan.summary.estConversions;
          const goalConv = plan.summary.targets.conversions;
          let gapLine = "";
          if (goal.conversions && conv < goalConv) {
            const pct = Math.round((conv / goalConv) * 100);
            const raiseTo = Math.round((plan.summary.totalBudget * goalConv) / conv / 1000) * 1000;
            gapLine = `\n\nHeads up: this forecasts **${conv.toLocaleString()} conversions — about ${pct}% of your ${goalConv.toLocaleString()} goal**, at ${plan.summary.estRoas}× ROAS (ahead of your ${plan.summary.targets.roas}× target). To close the gap, I can shift budget from awareness into retargeting, or raise the total to ~$${raiseTo.toLocaleString()}. Just tell me which.`;
          }
          const narrationText = `Here's your media plan for **${adv.companyName}**, anchored to their real performance. I've recommended ${plan.campaigns.length} campaigns across $${plan.summary.totalBudget.toLocaleString()}. Your brief leaned into display and social — I've added lookalike prospecting and DOOH for the acquisition goal.\n\nOne thing to flag: **DOOH is currently in closed beta.** If you'd like to include it, we can help activate it manually — just say the word.${gapLine}`;
          // Mark the thinking block complete (set its content) and append the refine card.
          setMessages((prev) => {
            const updated = prev.map((m) => (m.id === thinkingId ? { ...m, content: narrationText } : m));
            return [...updated, makeRefineCard()];
          });
          setState("split");
          collapseLeftRail();
        };
        setTimeout(runStep, 600);
        return;
      }

      if (field === "media-plan-refine") {
        const sel = selected[0];
        setMessages((prev) => [...prev, userMsg]);
        const plan = activeMediaPlanRef.current;
        let reply = "";
        let repostChips = true;
        if (sel === "activate") {
          if (plan) { const np = { ...plan, reviewState: "pending-approval" as const, lastModifiedAt: new Date().toISOString() }; setActiveMediaPlan(np); saveMediaPlan(np); }
          reply = "Sent to Marcus Patel for approval — you'll get the nod before anything goes live. Track it in Approvals.";
          repostChips = false;
        } else if (sel === "shift-dooh-social" && plan) {
          const dooh = plan.campaigns.find((c) => c.channel === "dooh");
          const social = plan.campaigns.find((c) => c.channel === "social");
          let p = plan;
          let move = 0;
          if (dooh && social) {
            move = Math.min(10_000, dooh.budget);
            p = editCampaignBudget(p, social.id, social.budget + move);
            p = editCampaignBudget(p, dooh.id, dooh.budget - move);
            const np = { ...p, aiTouched: [dooh.id, social.id] }; setActiveMediaPlan(np); saveMediaPlan(np);
          }
          const moveLabel = `$${(move / 1000).toLocaleString()}k`;
          reply = `Done — moved ${moveLabel} from DOOH to Social. Plan now forecasts **${p.summary.estConversions.toLocaleString()} conversions** at **${p.summary.estRoas}× ROAS**. Heads up: you lose DOOH's geo-fenced reach, and re-adding it (closed beta) is a manual step.`;
        } else if (sel === "why-ctv") {
          reply = "CTV is a brand play, not a direct-response channel — expect 3–5× better recall and a ~15–20% lift on your co-running retargeting over the flight, but few last-click conversions. That's why it sits in Awareness and reports VTR + brand-lift instead of ROAS. Want me to drop it and move the budget to lookalike prospecting?";
        } else {
          reply = "Sure — edit any channel's budget inline on the card, or change the total at the top and I'll rescale the mix. You can also tell me a number (e.g. “$90k”) and I'll apply it.";
        }
        const replyMsg: ChatMessage = { id: nextId(), role: "assistant", content: reply };
        setMessages((prev) => [...prev, replyMsg, ...(repostChips ? [makeRefineCard()] : [])]);
        return;
      }

      if (field.startsWith("platforms")) {
        // Platform selection → show connection card (OAuth-style)
        const intentTag = field.split(":")[1] || "performance";

        setMessages((prev) => [...prev, userMsg]);

        // Show the platform connection card
        const connectMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: "",
          toolCall: {
            type: "platform-connect",
            field: `connect:${intentTag}`,
            platformIds: selected,
            intentTag,
          },
        };
        setMessages((prev) => [...prev, connectMsg]);
        return;
      } else if (field === "post-performance" || field === "post-connect") {
        // Follow-up action cards → route to the right flow
        const selectedId = selected[0];
        setMessages((prev) => [...prev, userMsg]);

        if (selectedId === "campaign-plan" || selectedId === "build-campaign") {
          // Route through sendMessage which will detect campaign intent
          setTimeout(() => sendMessage("Build me a campaign"), 100);
        } else if (selectedId === "view-performance") {
          setTimeout(() => sendMessage("Show me how my marketing is performing"), 100);
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

          setState("split");
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

            setState("split");
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
          question: "How do you want to start?",
          subtitle: "You're always in charge — make the final tweaks either way.",
          field: "setup-mode",
          step: 1,
          totalSteps: 1,
          options: [
            { id: "express", label: "I know what I want", detail: "Fastest — I'll prefill the campaign with smart defaults on the canvas, and you tweak or accept." },
            { id: "guided", label: "Help me think it through", detail: "I'll ask a few quick questions to shape it, then prefill the plan for you to tweak." },
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
      content: `Let's build a media plan for ${name}. Do you already know what you want, or should we think it through together?`,
    };
    const card: ChatMessage = {
      id: nextId(),
      role: "assistant",
      content: "",
      toolCall: {
        type: "choices" as const,
        question: "How do you want to start?",
        subtitle: "You're always in charge — make the final tweaks either way.",
        field: "media-plan-mode",
        step: 1,
        totalSteps: 1,
        multiSelect: false,
        options: [
          { id: "myself", label: "I know what I want", detail: `Fastest — I'll prefill the plan from ${name}'s data right on the canvas, and you tweak or accept.` },
          { id: "withme", label: "Help me think it through", detail: `We'll shape the outcome together with ${name}'s data and signals, then I prefill the plan for you to tweak.` },
        ],
      },
    };
    setMessages([intro, card]);
  }, [setState]);

  const openFullscreen = useCallback(
    (initialMessage?: string) => {
      if (initialMessage) {
        if (state !== "resting") {
          // Chat is already open — continue in the current conversation and layout
          setTimeout(() => sendMessage(initialMessage), 0);
        } else {
          // Chat is closed — open a new session in the user's explicit entry layout
          setState(readEntryLayout());
          initNewSession(true);
          // Let intent routing run — user-typed messages and programmatic
          // messages like "Build me a campaign" should all be routed correctly.
          setTimeout(() => sendMessage(initialMessage), 0);
        }
      } else {
        // No message — just open the chat in the user's explicit entry layout
        setState(readEntryLayout());
      }
    },
    [state, sendMessage, initNewSession, setState]
  );

  const minimize = useCallback(() => {
    // If user's preferred layout is floating, go back to floating instead of split
    const preferred = typeof window !== "undefined" ? localStorage.getItem("fuseiq-layout-state") : null;
    if (preferred === "floating") {
      setState("floating");
    } else {
      setState("split");
      collapseLeftRail();
    }
  }, [collapseLeftRail, setState]);
  const close = useCallback(() => setState("resting"), [setState]);
  const expand = useCallback(() => setState("fullscreen"), [setState]);
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
  const startNewChat = useCallback(() => {
    initNewSession();
    setState("fullscreen");
  }, [initNewSession]);

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
      setActiveStrategy(null);
      setActiveNarrative(null);
      setActiveAudience(null);
      setState("fullscreen");
    },
    [setActiveStrategy, setActiveNarrative, setActiveAudience]
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
        minimize,
        close,
        expand,
        setDockSide,
        toggleDockSide,
        sendMessage,
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
