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
import type { CampaignPlan, StrategyPlan, KeywordChip, IABIndustry, IABRestrictedCategory, ChatMode } from "@/types/campaign";
import type { ChoiceOption } from "@/components/ai-companion/chat-choices";
import { useCampaign } from "./campaign-context";
import { buildNarrativeFromSeed } from "@/data/narrative-flow";
import { SEED_PERFORMANCE, SEED_ANOMALIES } from "@/data/seed-company";
import { getCurrentBrand, type BrandProfile } from "@/data/brand-profiles";

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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  artifact?: CampaignPlan | StrategyPlan;
  performanceSnapshot?: PerformanceSnapshot;
  toolCall?: ToolCall;
}

interface AICompanionContextValue {
  state: AICompanionState;
  dockSide: DockSide;
  chatMode: ChatMode;
  setChatMode: (mode: ChatMode) => void;
  messages: ChatMessage[];
  isLoading: boolean;
  openFullscreen: (initialMessage?: string) => void;
  startCampaignFlow: () => void;
  minimize: () => void;
  close: () => void;
  expand: () => void;
  toggleDockSide: () => void;
  sendMessage: (content: string) => void;
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
}

const AICompanionContext = createContext<AICompanionContextValue | null>(null);

let messageId = 0;
function nextId() {
  return `msg-${++messageId}`;
}

export function AICompanionProvider({ children }: { children: ReactNode }) {
  const { activePersona } = usePersona();
  const { setActivePlan, advertiser, setAdvertiser, setActiveStrategy, saveStrategy, saveNarrative, setActiveNarrative } = useCampaign();
  const [state, setState] = useState<AICompanionState>("resting");
  const [dockSide, setDockSide] = useState<DockSide>("right");
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [campaignIntent, setCampaignIntent] = useState<CampaignIntent | null>(null);
  const [strategyIntent, setStrategyIntent] = useState<StrategyIntent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    setMessages([
      {
        id: nextId(),
        role: "assistant",
        content: getWelcomeMessage(activePersona.id),
      },
    ]);
    setState("resting");
    setCampaignIntent(null);
    setStrategyIntent(null);
  }, [activePersona.id]);

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
        // Attach selected keywords to the strategy
        strategy.keywords = (intent.selectedKeywords || []).map((id) => ({
          id,
          label: id,
          category: "interest" as const,
          selected: true,
        }));

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
      }
    },
    [advertiser, setAdvertiser, setActiveStrategy, saveStrategy]
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

  // Brand context for API calls — cached once on mount
  const brandRef = useRef<BrandProfile | null>(null);
  useEffect(() => {
    brandRef.current = getCurrentBrand();
  }, []);

  const callAPI = useCallback(
    async (allMessages: ChatMessage[]) => {
      const apiMessages = allMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .filter((m) => m.content)
        .map((m) => ({ role: m.role, content: m.content }));

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
    (content: string) => {
      const userMsg: ChatMessage = { id: nextId(), role: "user", content };

      // If in strategy flow, handle inline
      if (strategyIntent) {
        const parsed = parseIntent(content);
        const merged: StrategyIntent = {
          ...strategyIntent,
          ...(parsed.objective ? { objective: parsed.objective } : {}),
        };
        evaluateStrategyFlow(merged, userMsg);
        return;
      }

      // If in legacy campaign flow
      if (campaignIntent) {
        const parsed = parseIntent(content);
        const merged = mergeIntent(campaignIntent, parsed);
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

      if (isCampaignIntent && !strategyIntent) {
        const parsed = parseIntent(content);
        const brand = brandRef.current;

        // Auto-infer advertiser from brand profile — never ask what we already know
        let hasAdv = !!advertiser;
        if (!hasAdv && brand) {
          const inferred = {
            id: `adv-${Date.now()}`,
            companyName: brand.name,
            websiteUrl: brand.domain,
            industry: brand.industry.toLowerCase().replace(/\s+/g, "-") as IABIndustry,
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
            industry: brand.industry.toLowerCase().replace(/\s+/g, "-") as IABIndustry,
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

      // Check for performance / connect-accounts / budget intent
      // Show the structured platform selection card (good UX for multi-select)
      // but use brand-aware intro text
      const isPerformanceIntent =
        lower.includes("performing") ||
        lower.includes("performance") ||
        lower.includes("connect my ad") ||
        lower.includes("connect your ad") ||
        lower.includes("connect accounts") ||
        lower.includes("data source") ||
        lower.includes("plan my monthly") ||
        lower.includes("plan your monthly") ||
        lower.includes("plan spend") ||
        lower.includes("set my budget") ||
        lower.includes("set your budget");

      if (isPerformanceIntent) {
        setMessages((prev) => [...prev, userMsg]);

        const brand = brandRef.current;
        const isConnect = lower.includes("connect");
        const isBudget = lower.includes("budget") || lower.includes("spend") || lower.includes("plan my") || lower.includes("plan your");
        const intentTag = isConnect ? "connect" : isBudget ? "budget" : "performance";

        // Brief intro, then straight to connection card — no selection step
        const ackMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: brand
            ? `Let's connect ${brand.name}'s ad accounts. Authorize the platforms you use — you can always add more later.`
            : "Let's get your accounts connected. Authorize the ones you use.",
        };

        const connectMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: "",
          toolCall: {
            type: "platform-connect",
            field: `connect:${intentTag}`,
            platformIds: [], // empty = show all platforms
            intentTag,
          },
        };

        setMessages((prev) => [...prev, ackMsg, connectMsg]);
        return;
      }

      // Check for narrative intent
      const isNarrativeIntent =
        lower.includes("cfo narrative") ||
        lower.includes("cfo report") ||
        lower.includes("monthly report") ||
        lower.includes("executive summary") ||
        lower.includes("budget meeting") ||
        (lower.includes("narrative") && lower.includes("may")) ||
        (lower.includes("draft") && lower.includes("narrative")) ||
        (lower.includes("what changed") && (lower.includes("paid social") || lower.includes("this month")));

      if (isNarrativeIntent) {
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);

        // Determine which month — default to May 2026 (latest in seed)
        const period = { month: 5, year: 2026 };

        setTimeout(() => {
          try {
            const narrative = buildNarrativeFromSeed(SEED_PERFORMANCE, SEED_ANOMALIES, period);
            saveNarrative(narrative);
            setActiveNarrative(narrative);

            const ackMsg: ChatMessage = {
              id: nextId(),
              role: "assistant",
              content: `Drafted your May 2026 marketing performance narrative for Norwest Analytics. Five sections covering spend, attribution, changes, recommendations, and confidence — each with provenance. You can review it on the Reports page.`,
            };
            const navMsg: ChatMessage = {
              id: nextId(),
              role: "assistant",
              content: `Head to Reports in the left nav to see the full narrative, or I can walk you through any section here.`,
            };
            setMessages((prev) => [...prev, ackMsg, navMsg]);
          } catch {
            const errMsg: ChatMessage = {
              id: nextId(),
              role: "assistant",
              content: "I couldn't generate the narrative — no data found for that period.",
            };
            setMessages((prev) => [...prev, errMsg]);
          }
          setIsLoading(false);
        }, 800);
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
    [strategyIntent, campaignIntent, evaluateStrategyFlow, evaluateAndRespond, callAPI, setActivePlan, saveNarrative, setActiveNarrative]
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
      const plural = platformCount > 1 ? "s" : "";

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
        // Performance → show structured snapshot card
        setIsLoading(true);
        setTimeout(() => {
          setIsLoading(false);

          const snapshotMsg: ChatMessage = {
            id: nextId(),
            role: "assistant",
            content: "",
            performanceSnapshot: {
              title: brand ? `${brand.name} Performance` : "Performance Overview",
              period: "Last 30 days",
              metrics: [
                {
                  label: "Shopping — Google Ads",
                  value: "ROAS 3.8×",
                  change: { direction: "up", text: "21%" },
                  context: "Strongest performer — driving most of the return",
                },
                {
                  label: "Retargeting — Site Visitors",
                  value: "ROAS 4.8×",
                  change: { direction: "up", text: "12%" },
                  context: "Nearly 2× your prospecting campaigns",
                },
                {
                  label: "Branded Search",
                  value: "CPC $0.42",
                  change: { direction: "down", text: "18%" },
                  context: "Good time to increase impression share",
                },
                {
                  label: "Overall Spend",
                  value: "$4,280",
                  change: { direction: "down", text: "12% under" },
                  context: `Pacing under budget across ${platformCount} platform${plural}`,
                },
              ],
            },
          };

          // Follow-up as a selection card, not plain text
          const followUpMsg: ChatMessage = {
            id: nextId(),
            role: "assistant",
            content: "",
            toolCall: {
              type: "choices",
              field: "post-performance",
              question: "What would you like to do next?",
              step: 1,
              totalSteps: 1,
              multiSelect: false,
              options: [
                { id: "campaign-plan", label: "Draft a campaign plan", detail: "Capitalize on the retargeting momentum" },
                { id: "dig-deeper", label: "Dig deeper into metrics", detail: "Break down performance by channel" },
                { id: "budget-realloc", label: "Reallocate budget", detail: "Shift spend toward top performers" },
              ],
            },
          };

          setMessages((prev) => [...prev, snapshotMsg]);
          setTimeout(() => {
            setMessages((prev) => [...prev, followUpMsg]);
          }, 600);
        }, 1000);
      }
    },
    [messages]
  );

  // Start the NEW strategy-based campaign flow
  const startCampaignFlow = useCallback(() => {
    setState("fullscreen");
    // Clear generic welcome — user arrived with specific intent
    setMessages([]);

    // Auto-infer advertiser from brand profile if known
    const brand = brandRef.current;
    let hasAdv = !!advertiser;

    if (!hasAdv && brand) {
      const inferred = {
        id: `adv-${Date.now()}`,
        companyName: brand.name,
        websiteUrl: brand.domain,
        industry: brand.industry.toLowerCase().replace(/\s+/g, "-") as IABIndustry,
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
        industry: brand.industry.toLowerCase().replace(/\s+/g, "-") as IABIndustry,
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
        // Replace the generic welcome with a clean slate — the user
        // arrived with a specific intent, so the welcome is noise.
        setMessages([]);
        // Small delay so the cleared state renders before sending
        setTimeout(() => sendMessage(initialMessage), 0);
      }
    },
    [sendMessage]
  );

  const minimize = useCallback(() => setState("docked"), []);
  const close = useCallback(() => setState("resting"), []);
  const expand = useCallback(() => setState("fullscreen"), []);
  const toggleDockSide = useCallback(
    () => setDockSide((prev) => (prev === "right" ? "left" : "right")),
    []
  );

  return (
    <AICompanionContext.Provider
      value={{
        state,
        dockSide,
        chatMode,
        setChatMode,
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
