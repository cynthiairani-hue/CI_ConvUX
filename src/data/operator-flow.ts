import type { OperatorPlan, StrategyPlan } from "@/types/campaign";

/**
 * Operator plan builder (Phase 9D).
 *
 * The Operator pattern lets the user delegate execution to the agent within
 * explicit guardrails (budget cap, frequency, scope). This builds the default
 * proposal for a given strategy; the user then picks "Let the AI run this"
 * (operator) vs "I'll drive" (manual) and tunes the guardrails before
 * authorizing. Execution itself is simulated.
 */
export function buildOperatorPlan(strategy: StrategyPlan): OperatorPlan {
  const monthly = strategy.budgetSchedule?.data?.monthlyBudget ?? 3000;
  return {
    id: `operator-${strategy.id}`,
    strategyId: strategy.id,
    strategyName: strategy.name,
    mode: null,
    guardrails: {
      budgetCap: monthly,
      frequency: "weekly",
      scope: ["bids", "budget-shifts", "creative-rotation"],
    },
    status: "proposed",
    createdAt: new Date().toISOString(),
  };
}
