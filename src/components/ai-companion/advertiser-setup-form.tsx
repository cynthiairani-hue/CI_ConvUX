"use client";

import { useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { IAB_RESTRICTED_CATEGORIES, IAB_INDUSTRIES } from "@/data/iab-categories";
import type { IABIndustry, IABRestrictedCategory } from "@/types/campaign";

interface AdvertiserSetupFormProps {
  question: string;
  step: number;
  totalSteps: number;
  onSubmit: (data: {
    companyName: string;
    websiteUrl: string;
    industry: IABIndustry;
    restrictedCategories: IABRestrictedCategory[];
  }) => void;
  onSkip?: () => void;
}

export function AdvertiserSetupForm({
  question,
  step,
  totalSteps,
  onSubmit,
  onSkip,
}: AdvertiserSetupFormProps) {
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [industry, setIndustry] = useState<IABIndustry | "">("");
  const [restrictedCategories, setRestrictedCategories] = useState<IABRestrictedCategory[]>([]);
  const [showRestricted, setShowRestricted] = useState(false);

  function toggleRestricted(id: IABRestrictedCategory) {
    setRestrictedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !websiteUrl.trim() || !industry) return;
    onSubmit({
      companyName: companyName.trim(),
      websiteUrl: websiteUrl.trim(),
      industry: industry as IABIndustry,
      restrictedCategories,
    });
  }

  const isValid = companyName.trim() && websiteUrl.trim() && industry;

  return (
    <div className="w-full overflow-hidden rounded-[20px] bg-white shadow-[0px_1px_6px_rgba(71,88,114,0.08),0px_7px_14px_rgba(71,88,114,0.08)]">
      {/* Header */}
      <div className="flex items-start gap-2 px-5 pb-1 pt-4">
        <div className="flex flex-1 flex-col min-w-0">
          <span className="text-[14px] font-semibold text-[#394859] leading-[22px]">
            {question}
          </span>
          <span className="text-[14px] text-[#8492A6] leading-[22px]">
            Tell us about the business you&apos;re advertising for.
          </span>
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
              className="rounded-full border border-[#D5DDE5] px-3 py-0.5 text-[12px] text-[#8492A6] transition-colors hover:bg-[#F9FAFB] hover:text-[#394859]"
            >
              Skip
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Company name */}
        <div className="border-t border-[#EDF1F5] px-5 py-3">
          <label className="mb-1.5 block text-[12px] font-medium text-[#8492A6] uppercase tracking-wider">
            Company name
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Acme Corp"
            className="w-full rounded-lg border border-[#E0E8F2] bg-white px-3 py-2 text-[14px] text-[#394859] outline-none placeholder:text-[#BFCCD9] focus:border-[#2C9FDD] focus:ring-1 focus:ring-[#2C9FDD]/20"
          />
        </div>

        {/* Website URL */}
        <div className="border-t border-[#EDF1F5] px-5 py-3">
          <label className="mb-1.5 block text-[12px] font-medium text-[#8492A6] uppercase tracking-wider">
            Website
          </label>
          <input
            type="text"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="e.g. acme.com"
            className="w-full rounded-lg border border-[#E0E8F2] bg-white px-3 py-2 text-[14px] text-[#394859] outline-none placeholder:text-[#BFCCD9] focus:border-[#2C9FDD] focus:ring-1 focus:ring-[#2C9FDD]/20"
          />
        </div>

        {/* Industry */}
        <div className="border-t border-[#EDF1F5] px-5 py-3">
          <label className="mb-1.5 block text-[12px] font-medium text-[#8492A6] uppercase tracking-wider">
            Industry
          </label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value as IABIndustry)}
            className={cn(
              "w-full rounded-lg border border-[#E0E8F2] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#2C9FDD] focus:ring-1 focus:ring-[#2C9FDD]/20",
              industry ? "text-[#394859]" : "text-[#BFCCD9]"
            )}
          >
            <option value="" disabled>
              Select an industry
            </option>
            {IAB_INDUSTRIES.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.label}
              </option>
            ))}
          </select>
        </div>

        {/* Restricted categories */}
        <div className="border-t border-[#EDF1F5] px-5 py-3">
          <button
            type="button"
            onClick={() => setShowRestricted(!showRestricted)}
            className="flex w-full items-center gap-1.5 text-[12px] font-medium text-[#8492A6] uppercase tracking-wider"
          >
            <span>Restricted content categories</span>
            {showRestricted ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {restrictedCategories.length > 0 && (
              <span className="ml-auto rounded-full bg-[#FEF3CD] px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-[#856404]">
                {restrictedCategories.length} selected
              </span>
            )}
          </button>
          {showRestricted && (
            <div className="mt-2 flex flex-col gap-1">
              {IAB_RESTRICTED_CATEGORIES.map((cat) => {
                const checked = restrictedCategories.includes(cat.id);
                return (
                  <label
                    key={cat.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#F7F9FB]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRestricted(cat.id)}
                      className="h-3.5 w-3.5 rounded border-[#C4CDD8] text-[#2C9FDD] focus:ring-[#2C9FDD]/20"
                    />
                    <span className="text-[13px] text-[#394859]">{cat.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="border-t border-[#EDF1F5] px-5 py-3">
          <button
            type="submit"
            disabled={!isValid}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[14px] font-medium transition-colors",
              isValid
                ? "bg-[#394859] text-white hover:bg-[#2D3A47]"
                : "bg-[#E0E8F2] text-[#8492A6] cursor-not-allowed"
            )}
          >
            Continue
            <ArrowUp className="h-4 w-4 rotate-90" />
          </button>
        </div>
      </form>
    </div>
  );
}
