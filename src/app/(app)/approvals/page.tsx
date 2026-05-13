"use client";

import { useCampaign } from "@/contexts/campaign-context";
import { usePersona } from "@/contexts/persona-context";
import { ApprovalReviewCard } from "@/components/patterns/approval-review-card";
import { Inbox } from "lucide-react";

export default function ApprovalsPage() {
  const { activePersona } = usePersona();
  const {
    approvalRequests,
    resolveApproval,
    addComment,
    activatePlan,
  } = useCampaign();

  const pendingForMe = approvalRequests.filter(
    (req) => {
      const approverIdMap: Record<string, string> = {
        "marcus-patel": "marcus-patel",
        "jordan-reyes": "jordan-reyes",
      };
      return req.sentTo === approverIdMap[activePersona.id] && !req.resolution;
    }
  );

  const sentByMe = approvalRequests.filter((req) =>
    req.sentBy === activePersona.id
  );

  const resolvedForMe = approvalRequests.filter(
    (req) => {
      const approverIdMap: Record<string, string> = {
        "marcus-patel": "marcus-patel",
        "jordan-reyes": "jordan-reyes",
      };
      return req.sentTo === approverIdMap[activePersona.id] && req.resolution;
    }
  );

  const hasContent = pendingForMe.length > 0 || sentByMe.length > 0 || resolvedForMe.length > 0;

  if (!hasContent) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Inbox className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h2 className="mt-3 text-lg font-medium text-foreground">
            No approvals yet
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Send a media plan for approval to see it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-lg font-semibold text-foreground">Approvals</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Review and manage approval requests.
      </p>

      {pendingForMe.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Pending your review
          </h2>
          <div className="space-y-4">
            {pendingForMe.map((req) => (
              <ApprovalReviewCard
                key={req.id}
                request={req}
                isReviewer={true}
                isSender={false}
                onResolve={(resolution, comment) =>
                  resolveApproval(req.id, resolution, comment, activePersona.id)
                }
                onComment={(content) => addComment(req.id, activePersona.id, content)}
              />
            ))}
          </div>
        </div>
      )}

      {sentByMe.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Sent by you
          </h2>
          <div className="space-y-4">
            {sentByMe.map((req) => (
              <ApprovalReviewCard
                key={req.id}
                request={req}
                isReviewer={false}
                isSender={true}
                onResolve={() => {}}
                onComment={(content) => addComment(req.id, activePersona.id, content)}
                onActivate={() => activatePlan(req.id)}
              />
            ))}
          </div>
        </div>
      )}

      {resolvedForMe.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Resolved
          </h2>
          <div className="space-y-4">
            {resolvedForMe.map((req) => (
              <ApprovalReviewCard
                key={req.id}
                request={req}
                isReviewer={false}
                isSender={false}
                onResolve={() => {}}
                onComment={(content) => addComment(req.id, activePersona.id, content)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
