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

export type AICompanionState = "resting" | "fullscreen" | "docked";
export type DockSide = "right" | "left";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AICompanionContextValue {
  state: AICompanionState;
  dockSide: DockSide;
  messages: ChatMessage[];
  openFullscreen: (initialMessage?: string) => void;
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

  useEffect(() => {
    setMessages([
      {
        id: nextId(),
        role: "assistant",
        content: getWelcomeMessage(activePersona.id),
      },
    ]);
    setState("resting");
  }, [activePersona.id]);

  const sendMessage = useCallback(
    (content: string) => {
      const userMsg: ChatMessage = { id: nextId(), role: "user", content };
      const aiResponse = getAIResponse(content, activePersona.id);
      const aiMsg: ChatMessage = {
        id: nextId(),
        role: "assistant",
        content: aiResponse,
      };
      setMessages((prev) => [...prev, userMsg, aiMsg]);
    },
    [activePersona.id]
  );

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
