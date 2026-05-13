"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { usePersona } from "@/contexts/persona-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface PersonaSwitcherProps {
  collapsed?: boolean;
}

export function PersonaSwitcher({ collapsed = false }: PersonaSwitcherProps) {
  const { activePersona, personas, setActivePersona } = usePersona();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent/50",
          collapsed && "justify-center px-2"
        )}
      >
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-[10px] font-medium">
            {activePersona.initials}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {activePersona.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {activePersona.verticalLabel}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 w-64 rounded-md border bg-popover p-1 shadow-md",
            collapsed ? "bottom-0 left-full ml-2" : "bottom-full left-0 mb-1"
          )}
        >
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Demo personas
          </p>
          {personas.map((persona) => (
            <button
              key={persona.id}
              onClick={() => {
                setActivePersona(persona.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left transition-colors hover:bg-accent",
                persona.id === activePersona.id && "bg-accent"
              )}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px] font-medium">
                  {persona.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{persona.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {persona.verticalLabel}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
