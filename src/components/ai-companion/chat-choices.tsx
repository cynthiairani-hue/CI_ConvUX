"use client";

import { useState } from "react";
import { Circle, CircleCheck, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChoiceOption {
  id: string;
  label: string;
  detail?: string;
  recommended?: boolean;
}

interface ChatChoicesProps {
  question: string;
  subtitle?: string;
  step: number;
  totalSteps: number;
  options: ChoiceOption[];
  multiSelect?: boolean;
  onSubmit: (selected: string[]) => void;
  onSkip?: () => void;
}

export function ChatChoices({
  question,
  subtitle,
  step,
  totalSteps,
  options,
  multiSelect = false,
  onSubmit,
  onSkip,
}: ChatChoicesProps) {
  const [selected, setSelected] = useState<string | null>(null);

  function handleSelect(id: string) {
    if (selected) return;
    setSelected(id);
    if (!multiSelect) {
      setTimeout(() => onSubmit([id]), 250);
    }
  }

  return (
    <div className="w-full rounded-[20px] bg-white py-2.5 shadow-[0px_1px_6px_rgba(71,88,114,0.08),0px_7px_14px_rgba(71,88,114,0.08)]">
      <div className="flex flex-col gap-2 px-4">
        {/* Header */}
        <div className="flex items-center gap-2 py-1.5">
          <div className="flex flex-1 flex-col min-w-0">
            <span className="text-sm font-semibold text-[#394859] leading-[22px]">
              {question}
            </span>
            {subtitle && (
              <span className="text-sm text-[#8492A6] leading-[22px]">
                {subtitle}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5 text-[#BFCCD9]" />
            <span className="text-xs text-[#8492A6] leading-[18px]">
              {step} of {totalSteps}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-[#394859]" />
          </div>
          {onSkip && (
            <button
              onClick={onSkip}
              className="shrink-0 rounded-lg border border-[#E0E8F2] px-2.5 py-1.5 text-sm text-[#8492A6] hover:text-[#394859] transition-colors"
            >
              Skip
            </button>
          )}
        </div>

        {/* Options */}
        {options.map((option) => {
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              disabled={selected !== null}
              className={cn(
                "flex w-full items-center gap-2 rounded-[20px] border px-4 py-3 text-left transition-all",
                isSelected
                  ? "border-[#2C9FDD]/30 bg-[#2C9FDD]/[0.06]"
                  : "border-[#E0E8F2] bg-white hover:bg-[#F9FAFB]",
                selected !== null && !isSelected && "opacity-50"
              )}
            >
              {isSelected ? (
                <CircleCheck className="h-[18px] w-[18px] shrink-0 text-[#2C9FDD]" />
              ) : (
                <Circle className="h-[18px] w-[18px] shrink-0 text-[#8492A6]" />
              )}
              <span className="flex-1 text-sm text-[#394859] leading-[22px] min-w-0">
                {option.label}
              </span>
            </button>
          );
        })}

        {/* Something else */}
        <button
          onClick={() => {}}
          disabled={selected !== null}
          className={cn(
            "flex w-full items-center gap-1.5 rounded-[20px] border border-[#E0E8F2] px-4 py-3 text-left transition-all",
            selected !== null ? "opacity-50" : "hover:bg-[#F9FAFB]"
          )}
        >
          <Pencil className="h-3.5 w-3.5 shrink-0 text-[#8492A6]" />
          <span className="text-sm text-[#8492A6] leading-[22px]">
            Something else
          </span>
        </button>
      </div>
    </div>
  );
}
