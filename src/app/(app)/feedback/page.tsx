"use client";

/* ── Feedback inbox ──
   Not in the nav — visit /feedback directly. Lists every entry visitors left
   through the Share-feedback dialog, newest first. */

import { useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";

interface FeedbackEntry {
  name: string;
  message: string;
  date: string;
  path?: string;
}

export default function FeedbackPage() {
  const [entries, setEntries] = useState<FeedbackEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/feedback")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.reason ?? "failed");
        setEntries(data.entries ?? []);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-[18px] font-semibold text-foreground">Feedback</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Everything visitors left through the Share-feedback dialog, newest first.
      </p>
      <div className="mt-6 space-y-3">
        {error && (
          <p className="text-[13px] text-muted-foreground">
            Couldn&apos;t load feedback ({error}) — storage may not be configured in this environment.
          </p>
        )}
        {entries?.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <MessageSquarePlus className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
            <p className="text-[13px] text-muted-foreground">No feedback yet — share the link and it lands here.</p>
          </div>
        )}
        {entries?.map((e, i) => (
          <div key={i} className="rounded-xl border border-border bg-white p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-semibold text-foreground">{e.name}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {new Date(e.date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                {e.path ? ` · ${e.path}` : ""}
              </span>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-5 text-foreground">{e.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
