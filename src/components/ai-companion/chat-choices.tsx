"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Circle, CircleCheck, Pencil, ChevronLeft, ChevronRight, ArrowUp } from "lucide-react";
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
  onFreeText: (text: string) => void;
}

export function ChatChoices({
  question,
  subtitle,
  step,
  totalSteps,
  options,
  multiSelect = false,
  onSubmit,
  onFreeText,
}: ChatChoicesProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [freeTextMode, setFreeTextMode] = useState(false);
  const [freeText, setFreeText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (freeTextMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [freeTextMode]);

  function handleSelect(id: string) {
    if (selected) return;
    setSelected(id);
    if (!multiSelect) {
      setTimeout(() => onSubmit([id]), 250);
    }
  }

  function handleFreeTextSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = freeText.trim();
    if (!trimmed) return;
    onFreeText(trimmed);
    setFreeText("");
    setFreeTextMode(false);
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
        </div>

        {/* Options */}
        {!freeTextMode && (
          <>
            {options.map((option) => {
              const isSelected = selected === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  disabled={selected !== null}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[20px] px-4 py-3 text-left transition-all",
                    isSelected
                      ? "bg-[#2C9FDD]/[0.06]"
                      : "hover:bg-[#F9FAFB]",
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
              onClick={() => setFreeTextMode(true)}
              disabled={selected !== null}
              className={cn(
                "flex w-full items-center gap-1.5 rounded-[20px] px-4 py-3 text-left transition-all",
                selected !== null ? "opacity-50" : "hover:bg-[#F9FAFB]"
              )}
            >
              <Pencil className="h-3.5 w-3.5 shrink-0 text-[#8492A6]" />
              <span className="text-sm text-[#8492A6] leading-[22px]">
                Something else
              </span>
            </button>
          </>
        )}

        {/* Free text input mode */}
        {freeTextMode && (
          <form onSubmit={handleFreeTextSubmit} className="flex items-center gap-2 rounded-[20px] px-4 py-3">
            <Pencil className="h-3.5 w-3.5 shrink-0 text-[#8492A6]" />
            <input
              ref={inputRef}
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Describe what you're looking for..."
              className="flex-1 bg-transparent text-sm text-[#394859] outline-none placeholder:text-[#8492A6]"
            />
            <button
              type="submit"
              disabled={!freeText.trim()}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
                freeText.trim()
                  ? "bg-[#394859] text-white"
                  : "bg-[#E0E8F2] text-[#8492A6]"
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
