export type ReadinessState = "ready" | "limited" | "blocked";

export interface PlanSection {
  label: string;
  value: string;
  rationale: string;
  readiness: ReadinessState;
  editable: boolean;
}

export interface CampaignPlan {
  id: string;
  name: string;
  status: "draft" | "pending-approval" | "approved" | "activated";
  sections: {
    objective: PlanSection;
    audience: PlanSection;
    budget: PlanSection;
    channels: PlanSection;
    creative: PlanSection;
    tracking: PlanSection;
  };
}

export type CampaignPlanSectionKey = keyof CampaignPlan["sections"];
