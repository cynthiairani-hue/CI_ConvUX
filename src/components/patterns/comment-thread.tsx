"use client";

import { useState } from "react";
import { MessageSquare, X, Check, Send, CornerDownRight, MapPin } from "lucide-react";
import type { MediaPlan, MediaPlanComment } from "@/types/campaign";
import { cn } from "@/lib/utils";

interface MediaPlanCommentsProps {
  plan: MediaPlan;
  /** The thread currently focused — its pin is highlighted on the canvas. */
  activeCommentId: string | null;
  /** Pin-drop armed? When true, clicking the canvas drops a comment pin. */
  pinMode: boolean;
  /** Toggle pin-drop mode (the "Add comment" affordance). */
  onTogglePin: () => void;
  onFocusComment: (id: string | null) => void;
  onReply: (parentId: string, content: string) => void;
  onResolve: (commentId: string, resolved: boolean) => void;
  onClose: () => void;
}

export function MediaPlanComments({
  plan,
  activeCommentId,
  pinMode,
  onTogglePin,
  onFocusComment,
  onReply,
  onResolve,
  onClose,
}: MediaPlanCommentsProps) {
  const all = plan.comments ?? [];
  const tops = all.filter((c) => !c.parentId);
  const repliesOf = (id: string) => all.filter((c) => c.parentId === id);

  // Pins are numbered in creation order, matching the canvas markers.
  const pinNumber = new Map<string, number>();
  let n = 0;
  tops.forEach((c) => { if (c.pin) { n += 1; pinNumber.set(c.id, n); } });

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-border bg-white">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4 text-foreground" />
          <span className="text-[13px] font-semibold text-foreground">Comments</span>
        </div>
        <div className="flex items-center gap-1">
          {/* The real "Add comment" affordance — arms pin-drop so a click on the
              plan drops a pin. While off, the plan stays fully editable. */}
          <button
            type="button"
            onClick={onTogglePin}
            title="Drop a comment pin on the plan"
            aria-pressed={pinMode}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              pinMode ? "bg-[#F3F0FF] text-[#7C5CFC]" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <MapPin className="h-3.5 w-3.5" /> {pinMode ? "Click the plan…" : "Add comment"}
          </button>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {tops.length === 0 ? (
          <div className="mt-8 text-center text-[12px] text-muted-foreground">
            No comments yet — click <span className="font-medium text-foreground">Add comment</span>, then drop a pin anywhere on the plan.
          </div>
        ) : (
          <div className="space-y-3">
            {tops.map((c) => (
              <ThreadItem
                key={c.id}
                comment={c}
                number={pinNumber.get(c.id)}
                replies={repliesOf(c.id)}
                active={activeCommentId === c.id}
                onFocus={() => onFocusComment(c.id)}
                onReply={onReply}
                onResolve={onResolve}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadItem({
  comment,
  number,
  replies,
  active,
  onFocus,
  onReply,
  onResolve,
}: {
  comment: MediaPlanComment;
  number?: number;
  replies: MediaPlanComment[];
  active: boolean;
  onFocus: () => void;
  onReply: (parentId: string, content: string) => void;
  onResolve: (commentId: string, resolved: boolean) => void;
}) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");

  function submitReply() {
    const t = text.trim();
    if (!t) return;
    onReply(comment.id, t);
    setText("");
    setReplying(false);
  }

  return (
    <div
      onClick={onFocus}
      className={cn(
        "cursor-pointer rounded-xl border bg-white p-3.5 transition-colors",
        active ? "border-[#7C5CFC] ring-1 ring-[#7C5CFC]/30" : "border-border hover:border-muted-foreground/30",
        comment.resolved && "opacity-60"
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white", comment.resolved ? "bg-muted-foreground/50" : "bg-[#7C5CFC]")}>
          {number ?? comment.authorName.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-foreground">{comment.authorName}</span>
            <span className={cn("shrink-0 rounded px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide", comment.authorRole === "client" ? "bg-[#F3F0FF] text-[#7C5CFC]" : "bg-muted text-muted-foreground")}>
              {comment.authorRole}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">{comment.timestamp}</span>
        </div>
      </div>

      <p className="mt-2.5 text-[13px] leading-relaxed text-foreground">{comment.content}</p>

      {replies.length > 0 && (
        <div className="mt-3 space-y-2.5 border-l-2 border-border pl-3">
          {replies.map((r) => (
            <div key={r.id}>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-semibold text-foreground">{r.authorName}</span>
                <span className="text-[10px] text-muted-foreground">{r.timestamp}</span>
              </div>
              <p className="mt-0.5 text-[12px] leading-relaxed text-foreground">{r.content}</p>
            </div>
          ))}
        </div>
      )}

      {replying ? (
        <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitReply(); if (e.key === "Escape") setReplying(false); }}
            placeholder="Reply…"
            className="flex-1 rounded-md border border-border px-2.5 py-1.5 text-[12px] outline-none focus:border-[#7C5CFC]"
          />
          <button onClick={submitReply} disabled={!text.trim()} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-4">
          <button onClick={(e) => { e.stopPropagation(); setReplying(true); }} className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground">
            <CornerDownRight className="h-3 w-3" /> Reply
          </button>
          <button onClick={(e) => { e.stopPropagation(); onResolve(comment.id, !comment.resolved); }} className={cn("flex items-center gap-1 text-[11px] font-medium transition-colors", comment.resolved ? "text-emerald-600" : "text-muted-foreground hover:text-foreground")}>
            <Check className="h-3 w-3" /> {comment.resolved ? "Resolved" : "Resolve"}
          </button>
        </div>
      )}
    </div>
  );
}
