"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectionOption {
  id: string;
  label: string;
  detail?: string;
  recommended?: boolean;
}

interface SelectionCardProps {
  title: string;
  step: number;
  totalSteps: number;
  options: SelectionOption[];
  multiSelect?: boolean;
  onNext: (selected: string[]) => void;
  onSkip?: () => void;
  recommendation?: string;
}

export function SelectionCard({
  title,
  step,
  totalSteps,
  options,
  multiSelect = false,
  onNext,
  onSkip,
  recommendation,
}: SelectionCardProps) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    if (multiSelect) {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
      );
    } else {
      setSelected([id]);
    }
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border bg-background">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {step} of {totalSteps}
          </span>
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Skip
            </button>
          )}
          <button
            onClick={() => onNext(selected)}
            disabled={selected.length === 0}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              selected.length > 0
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "bg-muted text-muted-foreground"
            )}
          >
            Next
          </button>
        </div>
      </div>

      <div className="p-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={option.id}
              onClick={() => toggle(option.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors",
                isSelected
                  ? "bg-blue-50 text-foreground"
                  : "hover:bg-muted/50"
              )}
            >
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isSelected
                    ? "border-blue-600 bg-blue-600"
                    : "border-muted-foreground/30"
                )}
              >
                {isSelected && (
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{option.label}</span>
                {option.detail && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {option.detail}
                  </span>
                )}
              </div>
              {option.recommended && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                  Recommended
                </span>
              )}
            </button>
          );
        })}
      </div>

      {recommendation && selected.length > 0 && (
        <div className="border-t px-5 py-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {recommendation}
          </p>
        </div>
      )}
    </div>
  );
}
