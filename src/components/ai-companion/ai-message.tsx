"use client";

import { cn } from "@/lib/utils";
import { PlanCard } from "@/components/patterns/plan-card";
import { useCampaign } from "@/contexts/campaign-context";
import { usePersona } from "@/contexts/persona-context";
import type { ChatMessage } from "@/contexts/ai-companion-context";

export function AIMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const { updateSection, sendForApproval, activePlan } = useCampaign();
  const { activePersona } = usePersona();

  if (message.toolCall) return null;
  if (!message.content && !message.artifact) return null;

  const plan = message.artifact
    ? activePlan && activePlan.id === message.artifact.id
      ? activePlan
      : message.artifact
    : null;

  return (
    <div
      className={cn("flex gap-3 px-4 py-3", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "max-w-[80%]",
          isUser
            ? "rounded-2xl rounded-tr-sm bg-[#E8F4FD] px-4 py-2.5 text-sm leading-relaxed text-[#394859]"
            : "text-sm leading-relaxed text-foreground"
        )}
      >
        {message.content}
        {plan && (
          <div className="mt-3">
            <PlanCard
              plan={plan}
              onUpdate={updateSection}
              onSendForApproval={(approverId) =>
                sendForApproval(approverId, activePersona.id)
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
