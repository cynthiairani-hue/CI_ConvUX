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
  campaignFlowSteps,
  buildPlanFromAnswers,
} from "@/data/campaign-flow";
import type { CampaignPlan } from "@/types/campaign";

export type AICompanionState = "resting" | "fullscreen" | "docked";
export type DockSide = "right" | "left";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  artifact?: CampaignPlan;
}

type FlowState =
  | { type: "idle" }
  | { type: "campaign-guided"; stepIndex: number; answers: Record<string, string> };

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
}

const AICompanionContext = createContext<AICompanionContextValue | null>(null);

let messageId = 0;
function nextId() {
  return `msg-${++messageId}`;
}

export function AICompanionProvider({ children }: { children: ReactNode }) {
  const { activePersona } = usePersona();
  const [state, setState] = useState<AICompanionState>("resting");
  const [dockSide, setDockSide] = useState<DockSide>("right");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [flow, setFlow] = useState<FlowState>({ type: "idle" });

  useEffect(() => {
    setMessages([
      {
        id: nextId(),
        role: "assistant",
        content: getWelcomeMessage(activePersona.id),
      },
    ]);
    setState("resting");
    setFlow({ type: "idle" });
  }, [activePersona.id]);

  const sendMessage = useCallback(
    (content: string) => {
      const userMsg: ChatMessage = { id: nextId(), role: "user", content };

      if (flow.type === "campaign-guided") {
        const steps = campaignFlowSteps[activePersona.id];
        const currentStep = steps[flow.stepIndex];
        const newAnswers = { ...flow.answers, [currentStep.id]: content };
        const nextIndex = flow.stepIndex + 1;

        if (nextIndex < steps.length) {
          const nextStep = steps[nextIndex];
          const aiMsg: ChatMessage = {
            id: nextId(),
            role: "assistant",
            content: `Got it. ${nextStep.question}`,
          };
          setMessages((prev) => [...prev, userMsg, aiMsg]);
          setFlow({
            type: "campaign-guided",
            stepIndex: nextIndex,
            answers: newAnswers,
          });
        } else {
          const plan = buildPlanFromAnswers(activePersona.id, newAnswers);
          const aiMsg: ChatMessage = {
            id: nextId(),
            role: "assistant",
            content:
              "Here's your campaign plan. Each section shows its readiness state — review the details, edit anything inline, and activate when ready.",
            artifact: plan,
          };
          setMessages((prev) => [...prev, userMsg, aiMsg]);
          setFlow({ type: "idle" });
        }
      } else {
        const aiResponse = getAIResponse(content, activePersona.id);
        const aiMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: aiResponse,
        };
        setMessages((prev) => [...prev, userMsg, aiMsg]);
      }
    },
    [activePersona.id, flow]
  );

  const startCampaignFlow = useCallback(() => {
    const steps = campaignFlowSteps[activePersona.id];
    const firstStep = steps[0];

    const aiMsg: ChatMessage = {
      id: nextId(),
      role: "assistant",
      content: `Let's build your campaign. I'll walk you through a few questions to get the plan right.\n\n${firstStep.question}`,
    };

    setState("fullscreen");
    setMessages((prev) => [...prev, aiMsg]);
    setFlow({ type: "campaign-guided", stepIndex: 0, answers: {} });
  }, [activePersona.id]);

  const openFullscreen = useCallback(
    (initialMessage?: string) => {
      setState("fullscreen");
      if (initialMessage) {
        sendMessage(initialMessage);
      }
    },
    [sendMessage]
  );

  const minimize = useCallback(() => {
    setState("docked");
  }, []);

  const close = useCallback(() => {
    setState("resting");
  }, []);

  const expand = useCallback(() => {
    setState("fullscreen");
  }, []);

  const toggleDockSide = useCallback(() => {
    setDockSide((prev) => (prev === "right" ? "left" : "right"));
  }, []);

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
