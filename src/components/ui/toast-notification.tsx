"use client";

import { X } from "lucide-react";
import { useCampaign } from "@/contexts/campaign-context";
import { cn } from "@/lib/utils";

export function Toast() {
  const { toast, dismissToast } = useCampaign();

  if (!toast.visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
        "flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg",
        "animate-in fade-in slide-in-from-bottom-4 duration-200"
      )}
    >
      <span className="text-sm font-medium text-foreground">
        {toast.message}
      </span>
      <button
        onClick={dismissToast}
        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
