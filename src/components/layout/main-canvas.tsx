"use client";

import { type ReactNode } from "react";

export function MainCanvas({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden">
      {children}
    </main>
  );
}
