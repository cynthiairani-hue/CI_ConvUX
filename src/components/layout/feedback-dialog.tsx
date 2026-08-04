"use client";

/* ── Internal feedback ──
   Floating light-yellow pill at the bottom-right of every page. Name prefills
   from the demo user; entries land in Vercel Blob via /api/feedback. */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, X } from "lucide-react";
import { useCampaign } from "@/contexts/campaign-context";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { showToast } = useCampaign();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("fuseiq-user") || "null");
      if (u?.name) setName(u.name);
    } catch { /* no prefill */ }
  }, [open]);

  async function submit() {
    const n = name.trim(), m = message.trim();
    if (!n || !m || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, message: m, path: pathname }),
      });
      if (res.ok) {
        showToast("Thanks — feedback sent to Cynthia");
        setMessage("");
        setOpen(false);
      } else {
        showToast("Feedback couldn't be sent (storage not configured in this environment)");
      }
    } catch {
      showToast("Feedback couldn't be sent — check your connection");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Floating pill, bottom-right — sits above the chat bubble's spot */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-6 z-40 flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-3.5 py-2 text-[12px] font-medium text-amber-900 shadow-md transition-all hover:bg-amber-200 hover:shadow-lg"
        title="Leave feedback for Cynthia — name, note, and date are collected"
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
        Internal feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-foreground/20" onClick={() => setOpen(false)}>
          <div className="w-96 rounded-xl border border-border bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-foreground">Internal feedback</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <label className="text-[11px] font-medium text-muted-foreground">Your name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 mb-3 w-full rounded-lg border border-border px-2.5 py-1.5 text-[13px] outline-none focus:border-foreground/40"
              placeholder="Who's this from?"
            />
            <label className="text-[11px] font-medium text-muted-foreground">Feedback</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="mt-1 w-full resize-none rounded-lg border border-border px-2.5 py-1.5 text-[13px] leading-5 outline-none focus:border-foreground/40"
              placeholder="What's working, what's confusing, what's missing…"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10.5px] text-muted-foreground/70">Sent with today&apos;s date and the page you&apos;re on</span>
              <button
                type="button"
                onClick={submit}
                disabled={!name.trim() || !message.trim() || sending}
                className="rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-40"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
