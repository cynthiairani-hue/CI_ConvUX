"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { usePersona } from "./persona-context";
import { getAIResponse, getWelcomeMessage } from "@/data/ai-responses";
import {
  parseIntent,
  mergeIntent,
  getNextChoiceTool,
  resolveChoice,
  getAcknowledgment,
  buildPlanFromIntent,
  type CampaignIntent,
} from "@/data/campaign-flow";
import type { CampaignPlan } from "@/types/campaign";
import type { ChoiceOption } from "@/components/ai-companion/chat-choices";
import { useCampaign } from "./campaign-context";

export type AICompanionState = "resting" | "fullscreen" | "docked";
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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  artifact?: CampaignPlan;
  toolCall?: ToolCallChoices;
}

interface AICompanionContextValue {
  state: AICompanionState;
  dockSide: DockSide;
  messages: ChatMessage[];
  openFullscreen: (initialMessage?: string) => void;
  startCampaignFlow: () => void;
  minimize: () => void;
  close: () => void;
  expand: () => void;
  toggleDockSide: () => void;
  sendMessage: (content: string) => void;
  submitChoice: (messageId: string, field: string, selected: string[]) => void;
}

const AICompanionContext = createContext<AICompanionContextValue | null>(null);

let messageId = 0;
function nextId() {
  return `msg-${++messageId}`;
}

export function AICompanionProvider({ children }: { children: ReactNode }) {
  const { activePersona } = usePersona();
  const { setActivePlan } = useCampaign();
  const [state, setState] = useState<AICompanionState>("resting");
  const [dockSide, setDockSide] = useState<DockSide>("right");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [campaignIntent, setCampaignIntent] = useState<CampaignIntent | null>(null);

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
  }, [activePersona.id]);

  // Core logic: evaluate intent and decide what to do next
  const evaluateAndRespond = useCallback(
    (intent: CampaignIntent, userMsg?: ChatMessage) => {
      const nextTool = getNextChoiceTool(intent);

      if (nextTool) {
        // AI needs more info — surface a selection card
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
        // AI has enough — build the Plan Card
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

  const sendMessage = useCallback(
    (content: string) => {
      const userMsg: ChatMessage = { id: nextId(), role: "user", content };
      const parsed = parseIntent(content);

      if (campaignIntent) {
        // We're in a campaign flow — merge new info
        const merged = mergeIntent(campaignIntent, parsed);
        evaluateAndRespond(merged, userMsg);
      } else if (
        content.toLowerCase().includes("campaign") ||
        content.toLowerCase().includes("build") ||
        content.toLowerCase().includes("launch") ||
        content.toLowerCase().includes("create")
      ) {
        // User wants to build a campaign — start intent collection
        evaluateAndRespond(parsed, userMsg);
      } else {
        // Regular conversation
        const aiResponse = getAIResponse(content, activePersona.id);
        const aiMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: aiResponse,
        };
        setMessages((prev) => [...prev, userMsg, aiMsg]);
      }
    },
    [activePersona.id, campaignIntent, evaluateAndRespond]
  );

  const submitChoice = useCallback(
    (msgId: string, field: string, selected: string[]) => {
      const resolved = resolveChoice(field as keyof CampaignIntent, selected);
      const label = selected
        .map((id) => {
          // Find the label from the original message's tool call
          const msg = messages.find((m) => m.id === msgId);
          const opt = msg?.toolCall?.options.find((o: ChoiceOption) => o.id === id);
          return opt?.label || id;
        })
        .join(", ");

      // Remove the tool call from the message (it's been answered)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, toolCall: undefined } : m
        )
      );

      // Add user's selection as a message
      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content: label,
      };

      const updated = mergeIntent(campaignIntent || {}, {
        [field]: resolved,
      } as CampaignIntent);

      evaluateAndRespond(updated, userMsg);
    },
    [campaignIntent, messages, evaluateAndRespond]
  );

  const startCampaignFlow = useCallback(() => {
    setState("fullscreen");
    const intent: CampaignIntent = {};
    const aiMsg: ChatMessage = {
      id: nextId(),
      role: "assistant",
      content: "Let's build your campaign.",
    };
    setCampaignIntent(intent);
    const nextTool = getNextChoiceTool(intent);
    if (nextTool) {
      const choiceMsg: ChatMessage = {
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
      setMessages((prev) => [...prev, aiMsg, choiceMsg]);
    } else {
      setMessages((prev) => [...prev, aiMsg]);
    }
  }, []);

  const openFullscreen = useCallback(
    (initialMessage?: string) => {
      setState("fullscreen");
      if (initialMessage) {
        sendMessage(initialMessage);
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
        messages,
        openFullscreen,
        startCampaignFlow,
        minimize,
        close,
        expand,
        toggleDockSide,
        sendMessage,
        submitChoice,
      }}
    >
      {children}
    </AICompanionContext.Provider>
  );
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
