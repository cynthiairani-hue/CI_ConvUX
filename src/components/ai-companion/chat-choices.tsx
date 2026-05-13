"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChoiceOption {
  id: string;
  label: string;
  detail?: string;
  recommended?: boolean;
}

interface ChatChoicesProps {
  options: ChoiceOption[];
  multiSelect?: boolean;
  onSubmit: (selected: string[]) => void;
  submitted?: boolean;
}

export function ChatChoices({
  options,
  multiSelect = false,
  onSubmit,
  submitted = false,
}: ChatChoicesProps) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    if (submitted) return;
    if (multiSelect) {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
      );
    } else {
      setSelected([id]);
    }
  }

  function handleSubmit() {
    if (selected.length === 0) return;
    onSubmit(selected);
  }

  if (submitted) return null;

  return (
    <div className="mt-3 space-y-1.5">
      {options.map((option) => {
        const isSelected = selected.includes(option.id);
        return (
          <button
            key={option.id}
            onClick={() => toggle(option.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all",
              isSelected
                ? "border-foreground/20 bg-foreground/[0.03]"
                : "border-transparent hover:bg-muted/50"
            )}
          >
            <div
              className={cn(
                "flex h-[18px] w-[18px] shrink-0 items-center justify-center transition-colors",
                multiSelect ? "rounded" : "rounded-full",
                isSelected
                  ? "border-2 border-foreground bg-foreground"
                  : "border-2 border-muted-foreground/30"
              )}
            >
              {isSelected && (
                <Check className="h-3 w-3 text-background" strokeWidth={3} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm text-foreground">{option.label}</span>
              {option.detail && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {option.detail}
                </p>
              )}
            </div>
            {option.recommended && (
              <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                Recommended
              </span>
            )}
          </button>
        );
      })}

      {selected.length > 0 && (
        <button
          onClick={handleSubmit}
          className="mt-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
        >
          {multiSelect
            ? `Continue with ${selected.length} selected`
            : "Continue"}
        </button>
      )}
    </div>
  );
}
