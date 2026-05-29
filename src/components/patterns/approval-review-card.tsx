"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  MessageSquare,
  Send,
  Clock,
  Check,
  RotateCcw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ApprovalRequest,
  ReadinessState,
  StrategyPlan,
} from "@/types/campaign";

/** Minimal shape shared by every renderable section (label + readiness + value). */
interface ReviewSection {
  label: string;
  value: string;
  readiness: ReadinessState;
}

/** Pull the 7 StrategyPlan sections into a flat, ordered list for review. */
function strategySections(strategy: StrategyPlan): ReviewSection[] {
  return [
    strategy.objective,
    strategy.budgetSchedule,
    strategy.audience,
    strategy.placements,
    strategy.bidding,
    strategy.creative,
    strategy.forecast,
  ].map((s) => ({ label: s.label, value: s.value, readiness: s.readiness }));
}

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

function ReviewSectionRow({ section }: { section: ReviewSection }) {
  return (
    <div className="border-b last:border-b-0 px-5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.label}
            </span>
            <ReadinessBadge state={section.readiness} />
          </div>
          <p className="text-sm text-foreground">{section.value}</p>
        </div>
      </div>
    </div>
  );
}

interface ApprovalReviewCardProps {
  request: ApprovalRequest;
  onResolve: (
    resolution: "approved" | "changes-requested" | "rejected",
    comment?: string
  ) => void;
  onComment: (content: string) => void;
  onActivate?: () => void;
  isReviewer: boolean;
  isSender: boolean;
}

export function ApprovalReviewCard({
  request,
  onResolve,
  onComment,
  onActivate,
  isReviewer,
  isSender,
}: ApprovalReviewCardProps) {
  const [commentText, setCommentText] = useState("");
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [changesComment, setChangesComment] = useState("");

  const sections = strategySections(request.strategy);

  const readyCounts = sections.reduce(
    (acc, section) => {
      acc[section.readiness]++;
      return acc;
    },
    { ready: 0, limited: 0, blocked: 0 }
  );

  function handleSubmitComment() {
    if (!commentText.trim()) return;
    onComment(commentText.trim());
    setCommentText("");
  }

  function handleRequestChanges() {
    onResolve("changes-requested", changesComment || undefined);
    setChangesComment("");
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            {request.strategy.name}
          </h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Sent by {request.sentByName} · {request.sentAt}
            </span>
          </div>
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
            !request.resolution && "bg-amber-50 text-amber-700",
            request.resolution === "approved" &&
              "bg-emerald-50 text-emerald-700",
            request.resolution === "changes-requested" &&
              "bg-orange-50 text-orange-700",
            request.resolution === "rejected" && "bg-red-50 text-red-700"
          )}
        >
          {!request.resolution && "Pending approval"}
          {request.resolution === "approved" && "Approved"}
          {request.resolution === "changes-requested" && "Changes requested"}
          {request.resolution === "rejected" && "Rejected"}
        </span>
      </div>

      {/* Strategy sections */}
      <div>
        {sections.map((section) => (
          <ReviewSectionRow key={section.label} section={section} />
        ))}
      </div>

      {/* Comments thread */}
      {request.comments.length > 0 && (
        <div className="border-t px-5 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Comments
            </span>
          </div>
          <div className="space-y-2">
            {request.comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-md bg-muted/50 px-3 py-2"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-foreground">
                    {comment.authorName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {comment.timestamp}
                  </span>
                </div>
                <p className="text-sm text-foreground">{comment.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comment input */}
      {!request.resolution && (
        <div className="border-t px-5 py-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
              placeholder="Add a comment..."
              className="flex-1 rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-foreground/20"
            />
            <button
              onClick={handleSubmitComment}
              disabled={!commentText.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Reviewer actions */}
      {isReviewer && !request.resolution && (
        <div className="border-t px-5 py-4">
          {showRejectConfirm ? (
            <div className="space-y-2">
              <textarea
                value={changesComment}
                onChange={(e) => setChangesComment(e.target.value)}
                placeholder="What needs to change? (optional)"
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground/20"
                rows={2}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRequestChanges}
                  className="inline-flex items-center gap-1.5 rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Request changes
                </button>
                <button
                  onClick={() => onResolve("rejected")}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </button>
                <button
                  onClick={() => setShowRejectConfirm(false)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onResolve("approved")}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </button>
              <button
                onClick={() => setShowRejectConfirm(true)}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Request changes
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sender sees approved → activate (gated by readiness) */}
      {isSender && request.resolution === "approved" && request.strategy.status !== "active" && (
        <div className="border-t px-5 py-4">
          {readyCounts.blocked > 0 || readyCounts.limited > 0 ? (
            <div className="space-y-2">
              <button
                disabled
                className="inline-flex items-center gap-1.5 rounded-md bg-foreground/30 px-4 py-2 text-sm font-medium text-background cursor-not-allowed"
              >
                Activate campaign
              </button>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {readyCounts.blocked > 0 && (
                  <p className="text-red-500">
                    {readyCounts.blocked} blocked — resolve before activation
                  </p>
                )}
                {readyCounts.limited > 0 && (
                  <p className="text-amber-600">
                    {readyCounts.limited} limited — complete these sections to activate
                  </p>
                )}
                <ul className="mt-1 ml-3 list-disc text-muted-foreground">
                  {sections
                    .filter((section) => section.readiness !== "ready")
                    .map((section) => (
                      <li key={section.label}>
                        {section.label}
                        <span className={
                          section.readiness === "blocked"
                            ? " text-red-500"
                            : " text-amber-600"
                        }>
                          {" "}— {section.readiness}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          ) : (
            <button
              onClick={onActivate}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
            >
              Activate campaign
            </button>
          )}
        </div>
      )}

      {/* Activated state */}
      {request.strategy.status === "active" && (
        <div className="border-t px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Campaign activated
          </div>
        </div>
      )}
    </div>
  );
}
