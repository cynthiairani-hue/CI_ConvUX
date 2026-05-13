"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  CampaignPlan,
  CampaignPlanSectionKey,
  ApprovalRequest,
} from "@/types/campaign";
import { approvers } from "@/data/approvers";
import { personas } from "@/data/personas";
import type { PersonaId } from "@/types/persona";

interface CampaignContextValue {
  activePlan: CampaignPlan | null;
  setActivePlan: (plan: CampaignPlan | null) => void;
  updateSection: (key: CampaignPlanSectionKey, value: string) => void;
  approvalRequests: ApprovalRequest[];
  sendForApproval: (approverId: string, senderPersonaId: PersonaId) => void;
  resolveApproval: (
    requestId: string,
    resolution: "approved" | "changes-requested" | "rejected",
    comment?: string,
    resolverPersonaId?: PersonaId
  ) => void;
  addComment: (requestId: string, authorId: PersonaId, content: string) => void;
  activatePlan: (requestId: string) => void;
  getPendingForPersona: (personaId: PersonaId) => ApprovalRequest[];
  toast: { message: string; visible: boolean };
  dismissToast: () => void;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

let commentId = 0;

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [activePlan, setActivePlan] = useState<CampaignPlan | null>(null);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>(
    []
  );
  const [toast, setToast] = useState({ message: "", visible: false });

  const dismissToast = useCallback(() => {
    setToast({ message: "", visible: false });
  }, []);

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 4000);
  }, []);

  const updateSection = useCallback(
    (key: CampaignPlanSectionKey, value: string) => {
      setActivePlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: {
            ...prev.sections,
            [key]: { ...prev.sections[key], value },
          },
        };
      });
    },
    []
  );

  const sendForApproval = useCallback(
    (approverId: string, senderPersonaId: PersonaId) => {
      if (!activePlan) return;

      const approver = approvers.find((a) => a.id === approverId);
      const sender = personas.find((p) => p.id === senderPersonaId);
      if (!approver || !sender) return;

      const updatedPlan: CampaignPlan = {
        ...activePlan,
        status: "pending-approval",
      };

      const request: ApprovalRequest = {
        id: `approval-${Date.now()}`,
        plan: updatedPlan,
        sentBy: senderPersonaId,
        sentByName: sender.name,
        sentTo: approverId,
        sentToName: approver.name,
        sentAt: new Date().toLocaleString(),
        comments: [],
      };

      setActivePlan(updatedPlan);
      setApprovalRequests((prev) => [...prev, request]);
      showToast(`Sent to ${approver.name} for approval`);
    },
    [activePlan, showToast]
  );

  const resolveApproval = useCallback(
    (
      requestId: string,
      resolution: "approved" | "changes-requested" | "rejected",
      comment?: string,
      resolverPersonaId?: PersonaId
    ) => {
      setApprovalRequests((prev) =>
        prev.map((req) => {
          if (req.id !== requestId) return req;

          const newComments = [...req.comments];
          if (comment && resolverPersonaId) {
            const resolver = personas.find((p) => p.id === resolverPersonaId);
            newComments.push({
              id: `comment-${++commentId}`,
              authorId: resolverPersonaId,
              authorName: resolver?.name || "Unknown",
              content: comment,
              timestamp: new Date().toLocaleString(),
            });
          }

          const newStatus =
            resolution === "approved" ? "approved" : "draft";

          return {
            ...req,
            resolution,
            resolvedAt: new Date().toLocaleString(),
            comments: newComments,
            plan: { ...req.plan, status: newStatus as CampaignPlan["status"] },
          };
        })
      );

      // Also update activePlan status
      setActivePlan((prev) => {
        if (!prev) return prev;
        const newStatus =
          resolution === "approved" ? "approved" : "draft";
        return { ...prev, status: newStatus as CampaignPlan["status"] };
      });

      const labels = {
        approved: "Plan approved",
        "changes-requested": "Changes requested",
        rejected: "Plan rejected",
      };
      showToast(labels[resolution]);
    },
    [showToast]
  );

  const addComment = useCallback(
    (requestId: string, authorId: PersonaId, content: string) => {
      const author = personas.find((p) => p.id === authorId);
      setApprovalRequests((prev) =>
        prev.map((req) => {
          if (req.id !== requestId) return req;
          return {
            ...req,
            comments: [
              ...req.comments,
              {
                id: `comment-${++commentId}`,
                authorId,
                authorName: author?.name || "Unknown",
                content,
                timestamp: new Date().toLocaleString(),
              },
            ],
          };
        })
      );
    },
    []
  );

  const activatePlan = useCallback(
    (requestId: string) => {
      setApprovalRequests((prev) =>
        prev.map((req) => {
          if (req.id !== requestId) return req;
          return {
            ...req,
            plan: { ...req.plan, status: "activated" },
          };
        })
      );
      setActivePlan((prev) => {
        if (!prev) return prev;
        return { ...prev, status: "activated" };
      });
      showToast("Campaign activated");
    },
    [showToast]
  );

  const getPendingForPersona = useCallback(
    (personaId: PersonaId) => {
      // Map persona IDs to approver IDs
      const approverIdMap: Record<string, string> = {
        "marcus-patel": "marcus-patel",
        "jordan-reyes": "jordan-reyes",
      };
      const approverId = approverIdMap[personaId];
      if (!approverId) return [];
      return approvalRequests.filter(
        (req) => req.sentTo === approverId && !req.resolution
      );
    },
    [approvalRequests]
  );

  return (
    <CampaignContext.Provider
      value={{
        activePlan,
        setActivePlan,
        updateSection,
        approvalRequests,
        sendForApproval,
        resolveApproval,
        addComment,
        activatePlan,
        getPendingForPersona,
        toast,
        dismissToast,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error("useCampaign must be used within a CampaignProvider");
  }
  return context;
}
