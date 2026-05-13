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
    schedule: PlanSection;
    destination: PlanSection;
    creative: PlanSection;
    conversion: PlanSection;
    tracking: PlanSection;
  };
}

export type CampaignPlanSectionKey = keyof CampaignPlan["sections"];

export interface Approver {
  id: string;
  name: string;
  role: string;
}

export interface ApprovalComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: string;
}

export interface ApprovalRequest {
  id: string;
  plan: CampaignPlan;
  sentBy: string;
  sentByName: string;
  sentTo: string;
  sentToName: string;
  sentAt: string;
  comments: ApprovalComment[];
  resolution?: "approved" | "changes-requested" | "rejected";
  resolvedAt?: string;
}
