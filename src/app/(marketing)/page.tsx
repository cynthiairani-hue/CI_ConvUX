"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <span className="text-sm font-semibold tracking-tight">FuseIQ</span>
        <Link
          href="/signup"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Sign in
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            AI-native marketing,
            <br />
            built for how you work.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
            Campaigns, audiences, and reporting in one intelligent surface.
            An AI companion that learns your brand, proposes structured
            artifacts, and acts within explicit guardrails.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      <footer className="flex h-14 items-center justify-center border-t px-6">
        <p className="text-xs text-muted-foreground">
          FuseIQ — an AI-native marketing platform prototype
        </p>
      </footer>
    </div>
  );
}
