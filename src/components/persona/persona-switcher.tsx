"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronUp, User, RotateCcw } from "lucide-react";
import { usePersona } from "@/contexts/persona-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { SEEDED_KEYS } from "@/data/seed-returning";

type DemoUserState = "returning" | "first-time";

function getDemoUserState(): DemoUserState {
  if (typeof window === "undefined") return "returning";
  return (localStorage.getItem("fuseiq-demo-user-state") as DemoUserState) || "returning";
}

function setDemoUserState(state: DemoUserState) {
  localStorage.setItem("fuseiq-demo-user-state", state);
  window.dispatchEvent(new Event("demo-state-change"));
}

export { getDemoUserState };

interface PersonaSwitcherProps {
  collapsed?: boolean;
}

// Working/complete state first (matches the picker leading with the ready scenario).
const USER_STATES: { id: DemoUserState; label: string; description: string }[] = [
  { id: "returning", label: "Returning user", description: "Has campaigns, performance data" },
  { id: "first-time", label: "First-time user", description: "Empty state, onboarding flow" },
];

// Same maturity order as the demo picker: Agency → In-house, then the
// collaboration (approver / client) personas. The ABM/Enterprise persona is
// removed from the demo entirely.
const PERSONA_ORDER = ["cynthia-agency", "cynthia-b2c", "marcus-patel", "jordan-reyes"];

export function PersonaSwitcher({ collapsed = false }: PersonaSwitcherProps) {
  const { activePersona, personas, setActivePersona } = usePersona();
  const sortedPersonas = [...personas]
    .filter((p) => p.vertical !== "b2b")
    .sort((a, b) => PERSONA_ORDER.indexOf(a.id) - PERSONA_ORDER.indexOf(b.id));
  const [open, setOpen] = useState(false);
  const [userState, setUserState] = useState<DemoUserState>("returning");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUserState(getDemoUserState());
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleUserStateChange(state: DemoUserState) {
    setUserState(state);
    setDemoUserState(state);
    // First-time = empty workspace: clear the seeded artifacts so the cold-start
    // experience is genuine. Returning = reload triggers ensureReturningSeed to
    // repopulate. (Demo mode — resetting state is expected.)
    if (state === "first-time") {
      SEEDED_KEYS.forEach((k) => localStorage.removeItem(k));
    }
    setOpen(false);
    // Reload the page to reflect the new state everywhere
    window.location.reload();
  }

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
            <ChevronUp
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
            "absolute z-50 w-64 rounded-xl border bg-popover shadow-lg",
            collapsed ? "bottom-0 left-full ml-2" : "bottom-full left-0 mb-1"
          )}
        >
          {/* User state toggle */}
          <div className="p-1.5">
            <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Demo mode
            </p>
            {USER_STATES.map((s) => {
              // Agency onboarding (first-time) needs work — disable it for the agency persona.
              const disabled = s.id === "first-time" && activePersona.vertical === "agency";
              return (
                <button
                  key={s.id}
                  disabled={disabled}
                  onClick={() => { if (!disabled) handleUserStateChange(s.id); }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    disabled ? "cursor-not-allowed opacity-50" : userState === s.id ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  <div className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    s.id === "first-time" ? "bg-[#F3F0FF]" : "bg-[#EBF5FB]"
                  )}>
                    {s.id === "first-time" ? (
                      <User className="h-3.5 w-3.5 text-[#7C5CFC]" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5 text-[#2C9FDD]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {disabled ? "Agency onboarding — coming soon" : s.description}
                    </p>
                  </div>
                  {!disabled && userState === s.id && (
                    <span className="text-[11px] text-[#2C9FDD]">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t" />

          {/* Persona switcher */}
          <div className="p-1.5">
            <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Personas
            </p>
            {sortedPersonas.map((persona) => {
              // ABM/Enterprise persona is coming soon — disable it (matches the picker).
              const disabled = persona.vertical === "b2b";
              return (
                <button
                  key={persona.id}
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    // Leaving any persona drops the agency "in-client" scope so a
                    // stale client brand can't leak into another persona.
                    localStorage.removeItem("fuseiq-active-client");
                    setActivePersona(persona.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    disabled ? "cursor-not-allowed opacity-50" : persona.id === activePersona.id ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px] font-medium">
                      {persona.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{persona.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {persona.verticalLabel}
                    </p>
                  </div>
                  {disabled ? (
                    <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">Coming soon</span>
                  ) : persona.id === activePersona.id ? (
                    <span className="ml-auto text-[11px] text-[#2C9FDD]">✓</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
