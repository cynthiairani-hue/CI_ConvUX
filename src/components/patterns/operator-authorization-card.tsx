"use client";

import { useState } from "react";
import { Bot, Hand, ShieldCheck, Check, CircleSlash } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  OperatorPlan,
  OperatorGuardrails,
  OperatorScope,
  OperatorFrequency,
} from "@/types/campaign";

interface OperatorAuthorizationCardProps {
  plan: OperatorPlan;
  /** Authorize the operator with the chosen guardrails. */
  onAuthorize: (guardrails: OperatorGuardrails) => void;
  /** Keep manual control. */
  onManual: () => void;
  /** Hand control back after the operator is active. */
  onTakeControl: () => void;
}

const SCOPE_LABELS: Record<OperatorScope, string> = {
  bids: "Adjust bids",
  "budget-shifts": "Shift budget across channels",
  "creative-rotation": "Rotate & pause creative",
  "audience-expansion": "Expand audiences",
};

const ALL_SCOPES: OperatorScope[] = [
  "bids",
  "budget-shifts",
  "creative-rotation",
  "audience-expansion",
];

export function OperatorAuthorizationCard({
  plan,
  onAuthorize,
  onManual,
  onTakeControl,
}: OperatorAuthorizationCardProps) {
  const [mode, setMode] = useState<"operator" | "manual" | null>(plan.mode);
  const [guardrails, setGuardrails] = useState<OperatorGuardrails>(plan.guardrails);

  function toggleScope(s: OperatorScope) {
    setGuardrails((g) => ({
      ...g,
      scope: g.scope.includes(s) ? g.scope.filter((x) => x !== s) : [...g.scope, s],
    }));
  }

  // Active state — operator is running
  if (plan.status === "active") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-5 py-4">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-emerald-600" />
            <span className="text-[14px] font-semibold text-foreground">Operator active</span>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            I&apos;m managing <span className="font-medium text-foreground">{plan.strategyName}</span> within
            your guardrails and will check in {plan.guardrails.frequency}. You can take back control anytime.
          </p>
        </div>
        <GuardrailSummary guardrails={plan.guardrails} />
        <button
          type="button"
          onClick={onTakeControl}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Hand className="h-3.5 w-3.5" /> Take back control
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold text-foreground">
          How should I run &ldquo;{plan.strategyName}&rdquo;?
        </h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Delegate execution to the AI within limits you set, or keep hands-on control.
        </p>
      </div>

      {/* The fork */}
      <div className="grid grid-cols-2 gap-3">
        <ChoiceTile
          icon={<Bot className="h-4 w-4" />}
          title="Let the AI run this"
          desc="Agentic execution within your guardrails. Checks in on a schedule."
          selected={mode === "operator"}
          onClick={() => setMode("operator")}
        />
        <ChoiceTile
          icon={<Hand className="h-4 w-4" />}
          title="I'll drive"
          desc="You stay hands-on — the AI proposes, you approve every change."
          selected={mode === "manual"}
          onClick={() => setMode("manual")}
        />
      </div>

      {/* Operator guardrails */}
      {mode === "operator" && (
        <div className="space-y-4 rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Your guardrails
          </div>

          {/* Budget cap */}
          <div>
            <label className="text-[12px] font-medium text-foreground">Monthly budget cap</label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[13px] text-muted-foreground">$</span>
              <input
                type="number"
                value={guardrails.budgetCap}
                onChange={(e) => setGuardrails((g) => ({ ...g, budgetCap: Number(e.target.value) || 0 }))}
                className="w-32 rounded-md border border-border px-2.5 py-1.5 text-[13px] text-foreground outline-none focus:border-ring"
              />
              <span className="text-[12px] text-muted-foreground">/month — the AI will never exceed this</span>
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="text-[12px] font-medium text-foreground">Optimization frequency</label>
            <div className="mt-1 inline-flex rounded-lg border border-border p-0.5">
              {(["daily", "weekly"] as OperatorFrequency[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setGuardrails((g) => ({ ...g, frequency: f }))}
                  className={cn(
                    "rounded-md px-3 py-1 text-[12px] font-medium capitalize transition-colors",
                    guardrails.frequency === f ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Scope */}
          <div>
            <label className="text-[12px] font-medium text-foreground">What the AI may adjust</label>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {ALL_SCOPES.map((s) => {
                const on = guardrails.scope.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleScope(s)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px] transition-colors",
                      on ? "border-[#2C9FDD] bg-[#EBF5FB] text-[#1A7BB5]" : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className={cn("flex h-4 w-4 items-center justify-center rounded border", on ? "border-[#2C9FDD] bg-[#2C9FDD] text-white" : "border-border")}>
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    {SCOPE_LABELS[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Won't-do guarantee */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-[12px] text-muted-foreground">
            <CircleSlash className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Without asking you first, the operator will never raise the total budget, change the objective,
              launch a new campaign, or touch other campaigns.
            </span>
          </div>

          <button
            type="button"
            onClick={() => onAuthorize(guardrails)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-foreground/90"
          >
            <Bot className="h-4 w-4" /> Authorize operator
          </button>
        </div>
      )}

      {/* Manual path */}
      {mode === "manual" && (
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-[13px] text-foreground">
            You&apos;ll stay in control. The AI will keep surfacing recommendations as artifacts —
            you approve each one before anything changes.
          </p>
          <button
            type="button"
            onClick={onManual}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-foreground/90"
          >
            <Hand className="h-4 w-4" /> Continue manually
          </button>
        </div>
      )}
    </div>
  );
}

function ChoiceTile({
  icon,
  title,
  desc,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start rounded-xl border p-4 text-left transition-all",
        selected ? "border-[#2C9FDD] bg-[#EBF5FB] shadow-sm" : "border-border bg-white hover:border-foreground/20"
      )}
    >
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", selected ? "bg-[#2C9FDD] text-white" : "bg-muted text-foreground")}>
        {icon}
      </span>
      <span className="mt-2.5 text-[13px] font-semibold text-foreground">{title}</span>
      <span className="mt-0.5 text-[12px] text-muted-foreground">{desc}</span>
    </button>
  );
}

function GuardrailSummary({ guardrails }: { guardrails: OperatorGuardrails }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 text-[13px]">
      <div className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Active guardrails
      </div>
      <ul className="mt-2 space-y-1 text-muted-foreground">
        <li>· Budget cap <span className="font-medium text-foreground">${guardrails.budgetCap.toLocaleString()}/mo</span></li>
        <li>· Optimizes <span className="font-medium text-foreground">{guardrails.frequency}</span></li>
        <li>· May adjust <span className="font-medium text-foreground">{guardrails.scope.map((s) => SCOPE_LABELS[s].toLowerCase()).join(", ") || "nothing"}</span></li>
      </ul>
    </div>
  );
}
