"use client";

import { useState } from "react";
import { MessageSquare, Send, X, Check, Pin, CornerDownRight } from "lucide-react";
import type { MediaPlan, MediaPlanComment } from "@/types/campaign";
import { cn } from "@/lib/utils";

interface MediaPlanCommentsProps {
  plan: MediaPlan;
  /** Pin mode is on → user is about to click an element to anchor a comment. */
  pinMode: boolean;
  onTogglePin: (on: boolean) => void;
  /** Anchor pre-filled from a pin click (composer opens anchored to this element). */
  composerAnchor: string | null;
  onClearComposerAnchor: () => void;
  /** Thread currently focused (rings the matching element on the canvas). */
  activeAnchor: string | null;
  onFocusAnchor: (anchor: string | null) => void;
  onAdd: (input: { content: string; anchor?: string; parentId?: string }) => void;
  onResolve: (commentId: string, resolved: boolean) => void;
  onClose: () => void;
}

const GENERAL = "__general__";

export function MediaPlanComments({
  plan,
  pinMode,
  onTogglePin,
  composerAnchor,
  onClearComposerAnchor,
  activeAnchor,
  onFocusAnchor,
  onAdd,
  onResolve,
  onClose,
}: MediaPlanCommentsProps) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<MediaPlanComment | null>(null);

  const all = plan.comments ?? [];
  const tops = all.filter((c) => !c.parentId);
  const repliesOf = (id: string) => all.filter((c) => c.parentId === id);

  // Group top-level comments by anchor (pinned groups first, General last).
  const groups = new Map<string, MediaPlanComment[]>();
  for (const c of tops) {
    const key = c.anchor ?? GENERAL;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  const groupKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === GENERAL) return 1;
    if (b === GENERAL) return -1;
    return a.localeCompare(b);
  });

  function submit() {
    const content = text.trim();
    if (!content) return;
    const anchor = replyTo ? replyTo.anchor : composerAnchor ?? undefined;
    onAdd({ content, anchor: anchor ?? undefined, parentId: replyTo?.id });
    setText("");
    setReplyTo(null);
    onClearComposerAnchor();
  }

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-border bg-white">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4 text-foreground" />
          <span className="text-[13px] font-semibold text-foreground">Comments</span>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Pin CTA */}
      <div className="border-b border-border px-4 py-2.5">
        <button
          onClick={() => onTogglePin(!pinMode)}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors",
            pinMode
              ? "border-[#7C5CFC] bg-[#F3F0FF] text-[#7C5CFC]"
              : "border-border text-foreground hover:bg-muted"
          )}
        >
          <Pin className="h-3.5 w-3.5" />
          {pinMode ? "Click an element to pin…" : "Comment on an element"}
        </button>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {tops.length === 0 ? (
          <div className="mt-8 text-center text-[12px] text-muted-foreground">
            No comments yet — pin one to start the conversation.
          </div>
        ) : (
          <div className="space-y-4">
            {groupKeys.map((key) => (
              <div key={key}>
                <button
                  onClick={() => onFocusAnchor(key === GENERAL ? null : key)}
                  className="mb-1.5 flex items-center gap-1.5"
                >
                  {key === GENERAL ? (
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      General
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        activeAnchor === key
                          ? "bg-[#7C5CFC] text-white"
                          : "bg-[#F3F0FF] text-[#7C5CFC]"
                      )}
                    >
                      <Pin className="h-2.5 w-2.5" />
                      {key}
                    </span>
                  )}
                </button>
                <div className="space-y-2">
                  {groups.get(key)!.map((c) => (
                    <CommentBubble
                      key={c.id}
                      comment={c}
                      replies={repliesOf(c.id)}
                      onResolve={onResolve}
                      onReply={(parent) => {
                        setReplyTo(parent);
                        onFocusAnchor(parent.anchor ?? null);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border px-4 py-3">
        {(replyTo || composerAnchor) && (
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F0FF] px-2 py-0.5 text-[10px] font-medium text-[#7C5CFC]">
              <Pin className="h-2.5 w-2.5" />
              {replyTo ? `Replying to ${replyTo.authorName}` : composerAnchor}
            </span>
            <button
              onClick={() => {
                setReplyTo(null);
                onClearComposerAnchor();
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Add a comment…"
            className="flex-1 rounded-md border border-border px-3 py-1.5 text-[13px] outline-none focus:ring-1 focus:ring-foreground/20"
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentBubble({
  comment,
  replies,
  onResolve,
  onReply,
}: {
  comment: MediaPlanComment;
  replies: MediaPlanComment[];
  onResolve: (commentId: string, resolved: boolean) => void;
  onReply: (parent: MediaPlanComment) => void;
}) {
  return (
    <div className={cn("rounded-md bg-muted/50 px-3 py-2", comment.resolved && "opacity-60")}>
      <div className="mb-0.5 flex items-center gap-2">
        <span className="text-[12px] font-medium text-foreground">{comment.authorName}</span>
        <span
          className={cn(
            "rounded px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide",
            comment.authorRole === "client" ? "bg-[#F3F0FF] text-[#7C5CFC]" : "bg-muted text-muted-foreground"
          )}
        >
          {comment.authorRole}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">{comment.timestamp}</span>
      </div>
      <p className="text-[13px] text-foreground">{comment.content}</p>

      {replies.length > 0 && (
        <div className="mt-2 space-y-1.5 border-l-2 border-border pl-2.5">
          {replies.map((r) => (
            <div key={r.id}>
              <div className="mb-0.5 flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-foreground">{r.authorName}</span>
                <span className="text-[10px] text-muted-foreground">{r.timestamp}</span>
              </div>
              <p className="text-[12px] text-foreground">{r.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-1.5 flex items-center gap-3">
        <button
          onClick={() => onReply(comment)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <CornerDownRight className="h-3 w-3" /> Reply
        </button>
        <button
          onClick={() => onResolve(comment.id, !comment.resolved)}
          className={cn(
            "flex items-center gap-1 text-[11px] transition-colors",
            comment.resolved ? "text-emerald-600" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Check className="h-3 w-3" /> {comment.resolved ? "Resolved" : "Resolve"}
        </button>
      </div>
    </div>
  );
}
