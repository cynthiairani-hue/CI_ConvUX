"use client";

import { useState, useRef, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Info,
  Pencil,
  Check,
  X,
  ChevronDown,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { approvers } from "@/data/approvers";
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
  section,
  editMode,
  editValue,
  onEditChange,
}: {
  section: PlanSection;
  editMode: boolean;
  editValue?: string;
  onEditChange?: (value: string) => void;
}) {
  const [showRationale, setShowRationale] = useState(false);
  const isEditing = editMode && section.editable;

  return (
    <div className="border-b last:border-b-0 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.label}
            </span>
            <ReadinessBadge state={section.readiness} />
          </div>

          {isEditing ? (
            <input
              type="text"
              value={editValue ?? section.value}
              onChange={(e) => onEditChange?.(e.target.value)}
              className="mt-1 w-full rounded-md border px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-foreground/20"
            />
          ) : (
            <p className="text-sm text-foreground">{section.value}</p>
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
  onSendForApproval?: (approverId: string) => void;
}

export function PlanCard({
  plan,
  onUpdate,
  onSendForApproval,
}: PlanCardProps) {
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<
    Partial<Record<CampaignPlanSectionKey, string>>
  >({});
  const [showApproverPicker, setShowApproverPicker] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState<string | null>(null);
  const approverRef = useRef<HTMLDivElement>(null);

  const sectionKeys = Object.keys(plan.sections) as CampaignPlanSectionKey[];
  const readyCounts = sectionKeys.reduce(
    (acc, key) => {
      acc[plan.sections[key].readiness]++;
      return acc;
    },
    { ready: 0, limited: 0, blocked: 0 }
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        approverRef.current &&
        !approverRef.current.contains(e.target as Node)
      ) {
        setShowApproverPicker(false);
        setSelectedApprover(null);
      }
    }
    if (showApproverPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showApproverPicker]);

  function handleStartEdit() {
    const initial: Partial<Record<CampaignPlanSectionKey, string>> = {};
    for (const key of sectionKeys) {
      if (plan.sections[key].editable) {
        initial[key] = plan.sections[key].value;
      }
    }
    setEditValues(initial);
    setEditMode(true);
  }

  function handleSave() {
    for (const key of sectionKeys) {
      const newVal = editValues[key];
      if (newVal !== undefined && newVal !== plan.sections[key].value) {
        onUpdate?.(key, newVal);
      }
    }
    setEditMode(false);
    setEditValues({});
  }

  function handleCancel() {
    setEditMode(false);
    setEditValues({});
  }

  function handleApproverSelect(approverId: string) {
    setSelectedApprover(approverId);
  }

  function handleConfirmApproval() {
    if (selectedApprover) {
      onSendForApproval?.(selectedApprover);
      setShowApproverPicker(false);
      setSelectedApprover(null);
    }
  }

  const selectedApproverData = approvers.find(
    (a) => a.id === selectedApprover
  );

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex-1 min-w-0">
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

        <div className="flex items-center gap-2">
          {plan.status === "draft" && (
            <>
              {editMode ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleSave}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50"
                    title="Save changes"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                    title="Cancel editing"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartEdit}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
                  title="Edit all fields"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              plan.status === "draft" && "bg-muted text-muted-foreground",
              plan.status === "pending-approval" &&
                "bg-amber-50 text-amber-700",
              plan.status === "approved" && "bg-emerald-50 text-emerald-700",
              plan.status === "activated" && "bg-blue-50 text-blue-700"
            )}
          >
            {plan.status === "pending-approval"
              ? "Pending approval"
              : plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
          </span>
        </div>
      </div>

      <div>
        {sectionKeys.map((key) => (
          <PlanSectionRow
            key={key}
            section={plan.sections[key]}
            editMode={editMode}
            editValue={editValues[key]}
            onEditChange={(value) =>
              setEditValues((prev) => ({ ...prev, [key]: value }))
            }
          />
        ))}
      </div>

      {plan.status === "draft" && (
        <div className="relative flex items-center gap-3 border-t px-5 py-4">
          <div ref={approverRef} className="relative">
            {selectedApprover ? (
              <button
                onClick={handleConfirmApproval}
                className="inline-flex whitespace-nowrap items-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                Send to {selectedApproverData?.name}
              </button>
            ) : (
              <button
                onClick={() =>
                  setShowApproverPicker(!showApproverPicker)
                }
                className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                Send for approval
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}

            {showApproverPicker && !selectedApprover && (
              <div className="absolute bottom-full left-0 mb-1 w-56 rounded-lg border bg-background py-1 shadow-lg">
                {approvers.map((approver) => (
                  <button
                    key={approver.id}
                    onClick={() => handleApproverSelect(approver.id)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-xs font-medium text-foreground">
                      {approver.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        {approver.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {approver.role}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-xs text-muted-foreground">
            {readyCounts.blocked > 0
              ? `${readyCounts.blocked} section${readyCounts.blocked > 1 ? "s" : ""} blocked — can be resolved before activation`
              : "Review sections above, then submit"}
          </span>
        </div>
      )}

      {plan.status === "pending-approval" && (
        <div className="flex items-center gap-2 border-t px-5 py-4 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Waiting for approval
        </div>
      )}

      {plan.status === "approved" && (
        <div className="flex items-center gap-2 border-t px-5 py-4">
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approved
          </span>
        </div>
      )}

      {plan.status === "activated" && (
        <div className="flex items-center gap-2 border-t px-5 py-4">
          <span className="flex items-center gap-1.5 text-sm text-blue-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Campaign activated
          </span>
        </div>
      )}
    </div>
  );
}
