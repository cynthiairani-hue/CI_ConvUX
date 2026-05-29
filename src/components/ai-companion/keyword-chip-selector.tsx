"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KeywordChip } from "@/types/campaign";

interface KeywordChipSelectorProps {
  question: string;
  step: number;
  totalSteps: number;
  keywords: KeywordChip[];
  onSubmit: (selectedIds: string[], allKeywords: KeywordChip[]) => void;
  onSkip?: () => void;
}

const CATEGORY_LABELS: Record<KeywordChip["category"], string> = {
  brand: "Brand",
  product: "Product",
  competitor: "Competitor",
  interest: "Interest",
};

const CATEGORY_ORDER: KeywordChip["category"][] = ["brand", "product", "interest", "competitor"];

export function KeywordChipSelector({
  question,
  step,
  totalSteps,
  keywords: initialKeywords,
  onSubmit,
  onSkip,
}: KeywordChipSelectorProps) {
  const [keywords, setKeywords] = useState<KeywordChip[]>(initialKeywords);

  function toggleKeyword(id: string) {
    setKeywords((prev) =>
      prev.map((k) => (k.id === id ? { ...k, selected: !k.selected } : k))
    );
  }

  function selectAll() {
    setKeywords((prev) => prev.map((k) => ({ ...k, selected: true })));
  }

  function deselectAll() {
    setKeywords((prev) => prev.map((k) => ({ ...k, selected: false })));
  }

  const selectedCount = keywords.filter((k) => k.selected).length;
  const allSelected = selectedCount === keywords.length;

  function handleSubmit() {
    const selectedIds = keywords.filter((k) => k.selected).map((k) => k.id);
    onSubmit(selectedIds, keywords);
  }

  const grouped = CATEGORY_ORDER
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      items: keywords.filter((k) => k.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="w-full overflow-hidden rounded-[20px] bg-white shadow-[0px_1px_6px_rgba(71,88,114,0.08),0px_7px_14px_rgba(71,88,114,0.08)]">
      {/* Header */}
      <div className="flex items-start gap-2 px-5 pb-1 pt-4">
        <div className="flex flex-1 flex-col min-w-0">
          <span className="text-[14px] font-semibold text-foreground leading-[22px]">
            {question}
          </span>
          <span className="text-[14px] text-muted-foreground leading-[22px]">
            Deselect any that don&apos;t apply. These shape your targeting.
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <div className="flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5 text-[#BFCCD9]" />
            <span className="text-[12px] text-muted-foreground leading-[18px]">
              {step} of {totalSteps}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-foreground" />
          </div>
          {onSkip && (
            <button
              onClick={onSkip}
              className="rounded-full border border-border px-3 py-0.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Skip
            </button>
          )}
        </div>
      </div>

      {/* Keywords by category */}
      {grouped.map((group) => (
        <div key={group.category} className="border-t border-border px-5 py-3">
          <span className="mb-2 block text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
            {group.label}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((kw) => (
              <button
                key={kw.id}
                type="button"
                onClick={() => toggleKeyword(kw.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[13px] transition-all",
                  kw.selected
                    ? "border-[#2C9FDD] bg-[#EBF5FB] text-[#1A7BB5]"
                    : "border-border bg-white text-muted-foreground hover:border-border"
                )}
              >
                {kw.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Footer: select all / continue */}
      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={allSelected ? deselectAll : selectAll}
            className="text-[13px] text-[#2C9FDD] hover:text-[#1A7BB5] transition-colors"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
          <span className="text-[12px] text-muted-foreground">
            {selectedCount} of {keywords.length} selected
          </span>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={selectedCount === 0}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-medium transition-colors",
            selectedCount > 0
              ? "bg-foreground text-white hover:bg-foreground/90"
              : "bg-border text-muted-foreground cursor-not-allowed"
          )}
        >
          Continue
          <ArrowUp className="h-4 w-4 rotate-90" />
        </button>
      </div>
    </div>
  );
}
