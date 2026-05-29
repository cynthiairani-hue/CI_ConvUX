"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Copy, Pencil, Archive, Trash2, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OverflowAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  destructive?: boolean;
  onClick: () => void;
}

const DEFAULT_ACTIONS: { id: string; label: string; icon: React.ReactNode; destructive?: boolean }[] = [
  { id: "duplicate", label: "Duplicate", icon: <Copy className="h-3.5 w-3.5" /> },
  { id: "rename", label: "Rename", icon: <Pencil className="h-3.5 w-3.5" /> },
  { id: "share", label: "Share", icon: <Share2 className="h-3.5 w-3.5" /> },
  { id: "archive", label: "Archive", icon: <Archive className="h-3.5 w-3.5" /> },
  { id: "delete", label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true },
];

export function getDefaultActions(onAction: (actionId: string) => void): OverflowAction[] {
  return DEFAULT_ACTIONS.map((a) => ({
    ...a,
    onClick: () => onAction(a.id),
  }));
}

export function CardOverflowMenu({
  actions,
  className,
}: {
  actions: OverflowAction[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-muted hover:text-muted-foreground"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-white py-1 shadow-lg">
          {actions.map((action, i) => (
            <button
              key={action.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors",
                action.destructive
                  ? "text-red-600 hover:bg-red-50"
                  : "text-foreground hover:bg-accent",
                i > 0 && actions[i - 1]?.destructive !== action.destructive && action.destructive && "mt-1 border-t border-border pt-1"
              )}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
