"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, ChevronsUpDown, Check, Layers, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AGENCY,
  faviconUrl,
  ensureAgencySeed,
  getActiveClient,
  enterClient,
  exitClient,
  type ActiveClient,
} from "@/data/seed-agency";
import type { AgencyClient } from "@/types/campaign";

/** Favicon with initials fallback, sized for the rail. */
function Logo({ domain, name, size = "md" }: { domain: string; name: string; size?: "sm" | "md" }) {
  const [failed, setFailed] = useState(false);
  const dim = size === "sm" ? "h-6 w-6" : "h-7 w-7";
  if (failed) {
    return (
      <div className={cn("flex shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-foreground", dim)}>
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={faviconUrl(domain)}
      alt=""
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-md border border-border bg-white object-contain p-1", dim)}
    />
  );
}

/**
 * Agency client switcher (9F). Lives at the top of the left rail for the agency
 * persona. Selecting a client scopes the entire app (campaigns, audiences,
 * reports, approvals) to that client; "All clients" returns to the portfolio.
 * The portfolio roster cards stay in sync — both call enterClient/exitClient.
 */
export function ClientSwitcher({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [active, setActive] = useState<ActiveClient | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setClients(ensureAgencySeed());
    setActive(getActiveClient());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function selectClient(c: AgencyClient) {
    enterClient(c);
    window.location.href = "/home";
  }

  function goAllClients() {
    exitClient();
    window.location.href = "/home";
  }

  // Collapsed rail: a single logo button that returns to the portfolio overview.
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={goAllClients}
        title={active ? `${active.name} — back to all clients` : `${AGENCY.name} portfolio`}
        className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white transition-colors hover:bg-accent"
      >
        {active ? (
          <Logo domain={active.domain} name={active.name} size="sm" />
        ) : (
          <Building2 className="h-4 w-4 text-foreground" />
        )}
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-white px-2.5 py-2 text-left transition-colors hover:bg-accent"
      >
        {active ? (
          <Logo domain={active.domain} name={active.name} />
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
            <Building2 className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {AGENCY.name}
          </div>
          <div className="truncate text-[13px] font-semibold text-foreground">
            {active ? active.name : "All clients"}
          </div>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-background p-1 shadow-lg">
          {/* Back to portfolio */}
          <button
            type="button"
            onClick={goAllClients}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent",
              !active && "bg-accent"
            )}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
              {active ? <ArrowLeft className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
            </div>
            <span className="flex-1 text-[13px] font-medium text-foreground">All clients</span>
            {!active && <Check className="h-3.5 w-3.5 text-foreground" />}
          </button>

          {clients.length > 0 && <div className="my-1 h-px bg-border" />}

          {clients.map((c) => {
            const isActive = active?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => selectClient(c)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent",
                  isActive && "bg-accent"
                )}
              >
                <Logo domain={c.domain} name={c.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-foreground">{c.name}</div>
                  <div className="truncate text-[11px] capitalize text-muted-foreground">
                    {c.status} · {c.campaigns} {c.campaigns === 1 ? "campaign" : "campaigns"}
                  </div>
                </div>
                {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
