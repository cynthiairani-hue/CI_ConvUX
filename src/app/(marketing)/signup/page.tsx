"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import type { Vertical } from "@/types/persona";
import { cn } from "@/lib/utils";

const verticals: { id: Vertical; label: string; description: string }[] = [
  {
    id: "b2c",
    label: "B2C",
    description: "Sell directly to consumers through e-commerce and retail.",
  },
  {
    id: "b2b",
    label: "B2B",
    description: "Drive pipeline and demos for your SaaS or enterprise product.",
  },
  {
    id: "agency",
    label: "Agency",
    description: "Manage campaigns and reporting across multiple clients.",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("Cynthia Irani");
  const [email, setEmail] = useState("");
  const [selectedVertical, setSelectedVertical] = useState<Vertical | null>(
    null
  );

  const canSubmit = name.trim() && email.trim() && selectedVertical;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedVertical) return;

    const personaId = `cynthia-${selectedVertical}`;
    localStorage.setItem("fuseiq-persona", personaId);
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center border-b px-6">
        <a href="/" className="text-sm font-semibold tracking-tight">
          FuseIQ
        </a>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell us a bit about yourself to get started.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-foreground"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Your name"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="you@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              What best describes your business?
            </label>
            <div className="mt-3 space-y-2">
              {verticals.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVertical(v.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                    selectedVertical === v.id
                      ? "border-foreground bg-accent/50"
                      : "border-border hover:border-foreground/20 hover:bg-accent/30"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      selectedVertical === v.id
                        ? "border-foreground bg-foreground"
                        : "border-border"
                    )}
                  >
                    {selectedVertical === v.id && (
                      <Check className="h-3 w-3 text-background" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {v.label}
                    </span>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {v.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-medium transition-colors",
              canSubmit
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "cursor-not-allowed bg-muted text-muted-foreground"
            )}
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </main>
    </div>
  );
}
