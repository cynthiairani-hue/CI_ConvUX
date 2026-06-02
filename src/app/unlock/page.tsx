"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

function UnlockForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const next = searchParams.get("next");
        // Full navigation so the middleware re-runs with the new cookie.
        window.location.href = next && next.startsWith("/") ? next : "/";
        return;
      }
      setError(true);
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-sm font-semibold tracking-tight">FuseIQ</span>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
            This site is private
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(false);
            }}
            placeholder="Password"
            aria-label="Password"
            aria-invalid={error}
            className="h-11 w-full rounded-lg border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
          />

          {error && (
            <p className="text-sm text-red-600">Incorrect password.</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Enter
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function UnlockPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <UnlockForm />
    </Suspense>
  );
}
