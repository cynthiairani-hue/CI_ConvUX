"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanCard } from "@/components/patterns/plan-card";
import { ChatChoices } from "./chat-choices";
import { useAICompanion } from "@/contexts/ai-companion-context";
import type { ChatMessage } from "@/contexts/ai-companion-context";

export function AIMessage({ message }: { message: ChatMessage }) {
  const { submitChoice } = useAICompanion();
  const isUser = message.role === "user";

  if (message.toolCall?.type === "choices") {
    return (
      <div className="px-4 py-3">
        <ChatChoices
          question={message.toolCall.question}
          subtitle={message.toolCall.subtitle}
          step={message.toolCall.step}
          totalSteps={message.toolCall.totalSteps}
          options={message.toolCall.options}
          multiSelect={message.toolCall.multiSelect}
          onSubmit={(selected) =>
            submitChoice(message.id, message.toolCall!.field, selected)
          }
        />
      </div>
    );
  }

  if (!message.content && !message.artifact) return null;

  return (
    <div
      className={cn("flex gap-3 px-4 py-3", isUser && "flex-row-reverse")}
    >
      {!isUser && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-foreground/5">
          <Sparkles className="h-3.5 w-3.5 text-foreground/70" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%]",
          isUser
            ? "rounded-2xl rounded-tr-sm bg-foreground px-4 py-2.5 text-sm leading-relaxed text-background"
            : "text-sm leading-relaxed text-foreground"
        )}
      >
        {message.content}
        {message.artifact && (
          <div className="mt-3">
            <PlanCard plan={message.artifact} />
          </div>
        )}
      </div>
    </div>
  );
}
