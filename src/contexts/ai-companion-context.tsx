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
import type { CampaignPlan, StrategyPlan, KeywordChip, IABIndustry, IABRestrictedCategory, ChatMode, DetailLevel } from "@/types/campaign";
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
  autoNameSession,
  inferSessionGroup,
  type StoredChatSession,
  type ChatSessionMeta,
} from "@/lib/storage";

export type AICompanionState = "resting" | "fullscreen" | "docked" | "split";
export type DockSide = "right" | "left";

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
}

interface AICompanionContextValue {
  state: AICompanionState;
  setState: (state: AICompanionState) => void;
  dockSide: DockSide;
  chatMode: ChatMode;
  setChatMode: (mode: ChatMode) => void;
  detailLevel: DetailLevel;
  setDetailLevel: (level: DetailLevel) => void;
  messages: ChatMessage[];
  isLoading: boolean;
  openFullscreen: (initialMessage?: string) => void;
  startCampaignFlow: () => void;
  minimize: () => void;
  close: () => void;
  expand: () => void;
  toggleDockSide: () => void;
  sendMessage: (content: string, files?: { name: string; type: string; size: number; preview?: string }[]) => void;
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
  const { setActivePlan, advertiser, setAdvertiser, setActiveStrategy, saveStrategy, saveNarrative, setActiveNarrative } = useCampaign();
  const { collapseLeftRail } = useLayout();
  const [state, setState] = useState<AICompanionState>("resting");
  const [dockSide, setDockSide] = useState<DockSide>("left");
  const [chatMode, setChatModeState] = useState<ChatMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("fuseiq-chat-mode") as ChatMode) || "assisted";
    }
    return "assisted";
  });

  const setChatMode = useCallback((mode: ChatMode) => {
    setChatModeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("fuseiq-chat-mode", mode);
    }
  }, []);
  const [detailLevel, setDetailLevelState] = useState<DetailLevel>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("fuseiq-detail-level") as DetailLevel) || "normal";
    }
    return "normal";
  });
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
    return loadChatSessionMetas();
  });

  const initNewSession = useCallback(() => {
    const sessionId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setCurrentSessionId(sessionId);
    setMessages([
      {
        id: nextId(),
        role: "assistant",
        content: getWelcomeMessage(activePersona.id),
      },
    ]);
    setCampaignIntent(null);
    setStrategyIntent(null);
    return sessionId;
  }, [activePersona.id]);

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
        // Build the strategy card
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

        const ackMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: `Building a ${intent.objective || "campaign"} strategy for ${adv.companyName}. Your media plan is on the canvas — review each section, edit anything, then save or send for approval when ready.`,
        };
        setMessages((prev) => [
          ...(userMsg ? [...prev, userMsg] : prev),
          ackMsg,
        ]);
        setStrategyIntent(null);

        // Auto-split: chat moves to left panel, canvas shows the strategy
        setState("split");
        collapseLeftRail();
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
          body: JSON.stringify({ messages: apiMessages, brandContext }),
        });

        if (!res.ok) {
          const data = await res.json();
          return { text: data.error || "Something went wrong.", toolCall: null };
        }

        return await res.json();
      } catch {
        return {
          text: "Connection error. Check that the dev server is running.",
          toolCall: null,
        };
      }
    },
    []
  );

  const sendMessage = useCallback(
    (content: string, files?: { name: string; type: string; size: number; preview?: string }[]) => {
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

      // Check for campaign intent — route to strategy flow instead of API
      const lower = content.toLowerCase();
      const isCampaignIntent =
        lower.includes("campaign") ||
        lower.includes("retargeting") ||
        lower.includes("re-targeting") ||
        lower.includes("prospecting") ||
        lower.includes("awareness") ||
        lower.includes("lead gen") ||
        lower.includes("app promotion") ||
        lower.includes("media plan") ||
        lower.includes("launch a") ||
        lower.includes("build a");

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

        const ackMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: parsed.objective
            ? `Got it — ${parsed.objective} campaign for ${brand?.name || "your brand"}. Let me set that up.`
            : brand
            ? `Let's build a campaign for ${brand.name}. First — what's the objective?`
            : "Let's build your campaign. What's the objective?",
        };
        setMessages((prev) => [...prev, ackMsg]);
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
            const perfData = brand ? FFERN_SEED_PERFORMANCE : SEED_PERFORMANCE;
            const anomalyData = brand ? FFERN_SEED_ANOMALIES : SEED_ANOMALIES;
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
            const perfData = brand ? FFERN_SEED_PERFORMANCE : SEED_PERFORMANCE;
            const anomalyData = brand ? FFERN_SEED_ANOMALIES : SEED_ANOMALIES;
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
    [strategyIntent, campaignIntent, evaluateStrategyFlow, evaluateAndRespond, callAPI, setActivePlan, saveNarrative, setActiveNarrative, collapseLeftRail, advertiser, setAdvertiser]
  );

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
          const aiMsg: ChatMessage = {
            id: nextId(),
            role: "assistant",
            content: brand
              ? `Got it — ${label} monthly. Here's a starting allocation for ${brand.name}:\n\n1. **Google Shopping** — 45% of budget. Highest ROAS channel for DTC fragrance\n2. **Meta retargeting** — 30%. Re-engage site visitors and past purchasers\n3. **Meta prospecting** — 20%. Lookalike audiences from your customer list\n4. **Brand search** — 5%. Protect branded terms, low CPC\n\nThis is a draft pacing plan — I'll adjust as performance data comes in.`
              : `Got it — ${label} monthly. I'll set up a pacing plan across your platforms.`,
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
    [strategyIntent, campaignIntent, messages, evaluateStrategyFlow, evaluateAndRespond, sendMessage, callAPI]
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
            const perfData = brand ? FFERN_SEED_PERFORMANCE : SEED_PERFORMANCE;
            const anomalyData = brand ? FFERN_SEED_ANOMALIES : SEED_ANOMALIES;
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

  // Start the NEW strategy-based campaign flow
  const startCampaignFlow = useCallback(() => {
    setState("fullscreen");
    // Clear generic welcome — user arrived with specific intent
    setMessages([]);

    // Auto-infer advertiser from brand profile if known
    // Re-check at call time in case the ref wasn't ready on mount
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
      // Pre-fill advertiser setup so the form is skipped
      intent.advertiserSetup = {
        companyName: brand.name,
        websiteUrl: brand.domain,
        industry: mapBrandIndustryToIAB(brand.industry),
        restrictedCategories: [],
      };
    }
    setStrategyIntent(intent);

    const aiMsg: ChatMessage = {
      id: nextId(),
      role: "assistant",
      content: brand
        ? `I've looked at ${brand.domain} — ${brand.industry.toLowerCase()}, ${brand.tagline.toLowerCase().replace(/\.$/, "")}. Let's build a campaign for ${brand.name}.`
        : "Let's build your campaign.",
    };

    const nextTool = getNextStrategyTool(intent, hasAdv);
    if (nextTool) {
      const toolMsg: ChatMessage = {
        id: nextId(),
        role: "assistant",
        content: "",
        toolCall: strategyToolToToolCall(nextTool),
      };
      setMessages([aiMsg, toolMsg]);
    } else {
      setMessages([aiMsg]);
    }
  }, [advertiser, setAdvertiser]);

  const openFullscreen = useCallback(
    (initialMessage?: string) => {
      setState("fullscreen");
      if (initialMessage) {
        // Start a fresh session for this intent
        initNewSession();
        // Small delay so the cleared state renders before sending
        setTimeout(() => sendMessage(initialMessage), 0);
      }
    },
    [sendMessage, initNewSession]
  );

  const minimize = useCallback(() => {
    setState("docked");
    collapseLeftRail();
  }, [collapseLeftRail]);
  const close = useCallback(() => setState("resting"), []);
  const expand = useCallback(() => setState("fullscreen"), []);
  const toggleDockSide = useCallback(
    () => setDockSide((prev) => (prev === "right" ? "left" : "right")),
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
      // Restore messages as simple chat messages
      setMessages(
        session.messages.map((m) => ({
          id: nextId(),
          role: m.role,
          content: m.content,
        }))
      );
      setCampaignIntent(null);
      setStrategyIntent(null);
      setState("fullscreen");
    },
    []
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
        dockSide,
        chatMode,
        setChatMode,
        detailLevel,
        setDetailLevel,
        messages,
        isLoading,
        openFullscreen,
        startCampaignFlow,
        minimize,
        close,
        expand,
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
