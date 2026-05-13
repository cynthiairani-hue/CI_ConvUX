"use client";

import { useState, type FormEvent } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function AIInput({
  onSend,
  placeholder = "Ask anything...",
  autoFocus = false,
}: AIInputProps) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
          value.trim()
            ? "bg-foreground text-background hover:bg-foreground/90"
            : "bg-muted text-muted-foreground"
        )}
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </form>
  );
}
