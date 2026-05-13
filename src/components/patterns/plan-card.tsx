"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Info,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CampaignPlan,
  CampaignPlanSectionKey,
  ReadinessState,
  PlanSection,
} from "@/types/campaign";

const readinessConfig: Record<
  ReadinessState,
  { icon: typeof CheckCircle2; label: string; color: string }
> = {
  ready: {
    icon: CheckCircle2,
    label: "Ready",
    color: "text-emerald-600 bg-emerald-50",
  },
  limited: {
    icon: AlertCircle,
    label: "Limited",
    color: "text-amber-600 bg-amber-50",
  },
  blocked: {
    icon: XCircle,
    label: "Blocked",
    color: "text-red-500 bg-red-50",
  },
};

function ReadinessBadge({ state }: { state: ReadinessState }) {
  const config = readinessConfig[state];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        config.color
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function PlanSectionRow({
  sectionKey,
  section,
  onUpdate,
}: {
  sectionKey: CampaignPlanSectionKey;
  section: PlanSection;
  onUpdate?: (key: CampaignPlanSectionKey, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(section.value);
  const [showRationale, setShowRationale] = useState(false);

  function handleSave() {
    onUpdate?.(sectionKey, editValue);
    setEditing(false);
  }

  function handleCancel() {
    setEditValue(section.value);
    setEditing(false);
  }

  return (
    <div className="group border-b last:border-b-0 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.label}
            </span>
            <ReadinessBadge state={section.readiness} />
          </div>

          {editing ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
                className="flex-1 rounded-md border px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-foreground/20"
              />
              <button
                onClick={handleSave}
                className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleCancel}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-sm text-foreground">{section.value}</p>
              {section.editable && (
                <button
                  onClick={() => setEditing(true)}
                  className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted transition-opacity"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowRationale(!showRationale)}
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors",
            showRationale
              ? "bg-foreground/5 text-foreground"
              : "hover:bg-muted"
          )}
          title="Why this?"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>

      {showRationale && (
        <div className="mt-2 rounded-md bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {section.rationale}
        </div>
      )}
    </div>
  );
}

interface PlanCardProps {
  plan: CampaignPlan;
  onUpdate?: (key: CampaignPlanSectionKey, value: string) => void;
  onActivate?: () => void;
}

export function PlanCard({ plan, onUpdate, onActivate }: PlanCardProps) {
  const sectionKeys = Object.keys(plan.sections) as CampaignPlanSectionKey[];
  const readyCounts = sectionKeys.reduce(
    (acc, key) => {
      acc[plan.sections[key].readiness]++;
      return acc;
    },
    { ready: 0, limited: 0, blocked: 0 }
  );

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{plan.name}</h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{readyCounts.ready} ready</span>
            {readyCounts.limited > 0 && (
              <span className="text-amber-600">
                {readyCounts.limited} limited
              </span>
            )}
            {readyCounts.blocked > 0 && (
              <span className="text-red-500">
                {readyCounts.blocked} blocked
              </span>
            )}
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            plan.status === "draft" && "bg-muted text-muted-foreground",
            plan.status === "pending-approval" && "bg-amber-50 text-amber-700",
            plan.status === "approved" && "bg-emerald-50 text-emerald-700",
            plan.status === "activated" && "bg-blue-50 text-blue-700"
          )}
        >
          {plan.status === "pending-approval"
            ? "Pending approval"
            : plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
        </span>
      </div>

      <div>
        {sectionKeys.map((key) => (
          <PlanSectionRow
            key={key}
            sectionKey={key}
            section={plan.sections[key]}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      {plan.status === "draft" && (
        <div className="flex items-center gap-3 border-t px-5 py-4">
          <button
            onClick={onActivate}
            className="inline-flex items-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            Send for approval
          </button>
          <span className="text-xs text-muted-foreground">
            {readyCounts.blocked > 0
              ? `${readyCounts.blocked} section${readyCounts.blocked > 1 ? "s" : ""} blocked — resolve to activate`
              : "Review sections above, then submit"}
          </span>
        </div>
      )}
    </div>
  );
}
