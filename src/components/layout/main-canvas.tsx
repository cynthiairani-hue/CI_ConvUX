"use client";

import { type ReactNode } from "react";

export function MainCanvas({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {children}
    </main>
  );
}
