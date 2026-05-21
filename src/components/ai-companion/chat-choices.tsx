"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Circle, CircleCheck, Square, CheckSquare, Pencil, ChevronLeft, ChevronRight, ArrowUp, ArrowRight } from "lucide-react";
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
  onFreeText,
  onSkip,
}: ChatChoicesProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [freeTextMode, setFreeTextMode] = useState(false);
  const [customInputMode, setCustomInputMode] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [customValue, setCustomValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (freeTextMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [freeTextMode]);

  useEffect(() => {
    if (customInputMode && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [customInputMode]);

  function handleSelect(id: string) {
    if (submitted || customInputMode) return;
    if (id === "custom") {
      setCustomInputMode(true);
      return;
    }

    if (multiSelect) {
      // Toggle selection
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    } else {
      // Single select — submit immediately
      setSelected(new Set([id]));
      setSubmitted(true);
      setTimeout(() => onSubmit([id]), 250);
    }
  }

  function handleMultiSubmit() {
    if (selected.size === 0) return;
    setSubmitted(true);
    onSubmit(Array.from(selected));
  }

  function handleCustomSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = customValue.trim().replace(/[^0-9]/g, "");
    if (!trimmed) return;
    onFreeText(`$${Number(trimmed).toLocaleString()}`);
    setCustomValue("");
    setCustomInputMode(false);
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
    <div className="w-full overflow-hidden rounded-[20px] bg-white shadow-[0px_1px_6px_rgba(71,88,114,0.08),0px_7px_14px_rgba(71,88,114,0.08)]">
      {/* Header */}
      <div className="flex items-start gap-2 px-5 pb-1 pt-4">
        <div className="flex flex-1 flex-col min-w-0">
          <span className="text-[14px] font-semibold text-[#394859] leading-[22px]">
            {question}
          </span>
          {subtitle && (
            <span className="text-[14px] text-[#8492A6] leading-[22px]">
              {subtitle}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <div className="flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5 text-[#BFCCD9]" />
            <span className="text-[12px] text-[#8492A6] leading-[18px]">
              {step} of {totalSteps}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-[#394859]" />
          </div>
          {onSkip && (
            <button
              onClick={onSkip}
              className="rounded-full border border-[#E0E8F2] px-3 py-0.5 text-[12px] text-[#8492A6] transition-colors hover:bg-[#F9FAFB] hover:text-[#394859]"
            >
              Skip
            </button>
          )}
        </div>
      </div>

      {/* Options */}
      {!freeTextMode && !customInputMode && (
        <div className="flex flex-col pb-1 pt-2">
          {options.map((option) => {
            const isSelected = selected.has(option.id);
            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                disabled={submitted}
                className={cn(
                  "flex w-full items-center gap-2.5 border-t border-[#E0E8F2] px-5 py-3 text-left transition-all",
                  isSelected
                    ? "bg-[#EBF5FB]"
                    : "hover:bg-[#F7F9FB]",
                  submitted && !isSelected && "opacity-50"
                )}
              >
                {multiSelect ? (
                  isSelected ? (
                    <CheckSquare className="h-[18px] w-[18px] shrink-0 text-[#2C9FDD]" />
                  ) : (
                    <Square className="h-[18px] w-[18px] shrink-0 text-[#C4CDD8]" />
                  )
                ) : isSelected ? (
                  <CircleCheck className="h-[18px] w-[18px] shrink-0 text-[#2C9FDD]" />
                ) : (
                  <Circle className="h-[18px] w-[18px] shrink-0 text-[#C4CDD8]" />
                )}
                <div className="flex flex-1 flex-col min-w-0">
                  <span className="text-[14px] text-[#394859] leading-[22px]">
                    {option.label}
                  </span>
                  {option.detail && (
                    <span className="text-[12px] text-[#8492A6] leading-[16px]">
                      {option.detail}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {/* Something else */}
          {!multiSelect && (
            <button
              onClick={() => setFreeTextMode(true)}
              disabled={submitted}
              className={cn(
                "flex w-full items-center gap-2 border-t border-[#E0E8F2] px-5 py-3 text-left transition-all",
                submitted ? "opacity-50" : "hover:bg-[#F7F9FB]"
              )}
            >
              <Pencil className="h-3.5 w-3.5 shrink-0 text-[#8492A6]" />
              <span className="text-[14px] text-[#8492A6] leading-[22px]">
                Something else
              </span>
            </button>
          )}

          {/* Multi-select: Continue button */}
          {multiSelect && !submitted && (
            <div className="border-t border-[#E0E8F2] px-5 py-3">
              <button
                onClick={handleMultiSubmit}
                disabled={selected.size === 0}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[14px] font-medium transition-colors",
                  selected.size > 0
                    ? "bg-[#394859] text-white hover:bg-[#2A3744]"
                    : "bg-[#E0E8F2] text-[#8492A6] cursor-not-allowed"
                )}
              >
                Continue with {selected.size} platform{selected.size !== 1 ? "s" : ""}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Custom amount input */}
      {customInputMode && (
        <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 border-t border-[#E0E8F2] px-5 py-3">
          <span className="text-[14px] font-medium text-[#394859]">$</span>
          <input
            ref={customInputRef}
            type="text"
            inputMode="numeric"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Enter monthly budget"
            className="flex-1 bg-transparent text-[14px] text-[#394859] outline-none placeholder:text-[#8492A6]"
          />
          <button
            type="submit"
            disabled={!customValue.trim()}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
              customValue.trim()
                ? "bg-[#394859] text-white"
                : "bg-[#E0E8F2] text-[#8492A6]"
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      )}

      {/* Free text input mode */}
      {freeTextMode && (
        <form onSubmit={handleFreeTextSubmit} className="flex items-center gap-2 border-t border-[#E0E8F2] px-5 py-3">
          <Pencil className="h-3.5 w-3.5 shrink-0 text-[#8492A6]" />
          <input
            ref={inputRef}
            type="text"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Describe what you're looking for..."
            className="flex-1 bg-transparent text-[14px] text-[#394859] outline-none placeholder:text-[#8492A6]"
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
  );
}
