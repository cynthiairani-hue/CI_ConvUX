"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Plus, ArrowRight, Sparkles, Building2, Check, Clock, TrendingUp, PencilLine, Plug, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCampaign } from "@/contexts/campaign-context";
import {
  AGENCY,
  BRAINLABS_DISCOVERED,
  persistAgencyClients,
  ensureAgencySeed,
  inferClientFromDomain,
  discoveredToClient,
  faviconUrl,
  enterClient,
  getPortfolioSignals,
  type SignalKind,
} from "@/data/seed-agency";
import type { AgencyClient } from "@/types/campaign";

/** Visual treatment per signal kind — calm, evidence-first, not alarmist. */
const SIGNAL_STYLE: Record<SignalKind, { icon: LucideIcon; chip: string; tint: string }> = {
  approval: { icon: Clock, chip: "In approval", tint: "bg-amber-50 text-amber-600" },
  anomaly: { icon: TrendingUp, chip: "Needs review", tint: "bg-amber-50 text-amber-600" },
  setup: { icon: Plug, chip: "Setup", tint: "bg-amber-50 text-amber-600" },
  draft: { icon: PencilLine, chip: "Draft", tint: "bg-muted text-muted-foreground" },
  opportunity: { icon: Sparkles, chip: "Opportunity", tint: "bg-[#EBF5FB] text-[#2C9FDD]" },
};

const STATUS_STYLE: Record<AgencyClient["status"], string> = {
  active: "bg-emerald-50 text-emerald-600",
  onboarding: "bg-amber-50 text-amber-600",
  paused: "bg-muted text-muted-foreground",
};

// Demo control: only fully-validated clients are enterable. The rest still show
// (the portfolio looks real) but are disabled until their scope is ready.
const LIVE_CLIENT_IDS = new Set(["client-vans"]);

/** Client logo from favicon, with initials fallback if it fails to load. */
function ClientLogo({ domain, name, size = "md" }: { domain: string; name: string; size?: "sm" | "md" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const box = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-12 w-12" : "h-9 w-9";
  const pad = size === "sm" ? "p-1" : size === "lg" ? "p-2" : "p-1.5";
  const text = size === "lg" ? "text-[14px]" : "text-[11px]";
  if (failed) {
    return (
      <div className={cn("flex shrink-0 items-center justify-center rounded-xl bg-muted font-semibold text-foreground", box, text)}>
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={faviconUrl(domain)}
      alt=""
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-xl border border-border bg-white object-contain", box, pad)}
    />
  );
}

export function AgencyPortfolioView() {
  const { showToast } = useCampaign();
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [domain, setDomain] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setClients(ensureAgencySeed());
  }, []);

  function toggleDiscovered(d: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  function addSelected() {
    const picks = BRAINLABS_DISCOVERED.filter((d) => selected.has(d.domain)).map(discoveredToClient);
    if (picks.length === 0) return;
    const next = [...picks, ...clients];
    setClients(next);
    persistAgencyClients(next);
    setSelected(new Set());
    setShowAdd(false);
    showToast(`Added ${picks.length} client${picks.length > 1 ? "s" : ""} to your roster`);
  }

  function addClient(e: FormEvent) {
    e.preventDefault();
    const d = domain.trim();
    if (!d) return;
    const client = inferClientFromDomain(d);
    const next = [client, ...clients];
    setClients(next);
    persistAgencyClients(next);
    setDomain("");
    setShowAdd(false);
    showToast(`Pulled ${client.name}'s profile from ${client.domain} — added to your roster`);
  }

  function openClient(c: AgencyClient) {
    // Enter the client's scoped workspace. Full reload so every context
    // (brand, campaigns, audiences, reports) re-hydrates against the client.
    enterClient(c);
    window.location.href = "/home";
  }

  /** Act on a triage signal: enter that client, deep-link to the right surface. */
  function actOnSignal(clientId: string, target: string) {
    const c = clients.find((x) => x.id === clientId);
    if (!c) return;
    enterClient(c);
    window.location.href = `/${target}`;
  }

  const signals = getPortfolioSignals(clients);
  const totalSpend = clients.reduce((s, c) => s + c.monthlyBudget, 0);

  // Manager view = oversight + navigation. Show only the 3 most urgent items
  // across the book (triage), and a per-client COUNT — the items themselves
  // live inside each client's scoped home.
  const topPriorities = signals.filter((s) => LIVE_CLIENT_IDS.has(s.clientId)).slice(0, 3);
  const reviewCount = new Map<string, number>();
  for (const s of signals) reviewCount.set(s.clientId, (reviewCount.get(s.clientId) ?? 0) + 1);

  const q = query.trim().toLowerCase();
  const filtered = q ? clients.filter((c) => c.name.toLowerCase().includes(q)) : clients;

  // "From your book" = clients the agency manages (discovered) but not yet set up here.
  const undiscovered = BRAINLABS_DISCOVERED.filter(
    (d) => !clients.some((c) => c.domain === d.domain)
  );

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    if (filtered.length > 0) openClient(filtered[0]); // Enter → jump into the top match
  }

  return (
    <div className="mx-auto my-auto w-full max-w-3xl space-y-5 px-4 sm:px-8 py-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {AGENCY.name} — client portfolio
          </h1>
          <p className="text-sm text-muted-foreground">
            {clients.length} {clients.length === 1 ? "client" : "clients"} · ${totalSpend.toLocaleString()}/mo managed · {AGENCY.tagline}
          </p>
        </div>
      </div>

      {clients.length === 0 ? (
        /* Net-new agency: discovery empty-state */
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-[#2C9FDD]" />
            We found these clients on {AGENCY.domain}
          </div>
          <p className="mb-3 text-[12px] text-muted-foreground">
            Add the ones you manage — nothing is added until you confirm.
          </p>
          <div className="space-y-1.5">
            {BRAINLABS_DISCOVERED.map((d) => {
              const on = selected.has(d.domain);
              return (
                <button
                  key={d.domain}
                  type="button"
                  onClick={() => toggleDiscovered(d.domain)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                    on ? "border-[#2C9FDD] bg-[#EBF5FB]" : "border-border hover:bg-accent"
                  )}
                >
                  <ClientLogo domain={d.domain} name={d.name} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-foreground">{d.name}</div>
                    <div className="text-[11px] text-muted-foreground">{d.industry} · {d.domain}</div>
                  </div>
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded border", on ? "border-[#2C9FDD] bg-[#2C9FDD] text-white" : "border-border")}>
                    {on && <Check className="h-3 w-3" />}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={addSelected}
            disabled={selected.size === 0}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-foreground/90 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" /> Add {selected.size > 0 ? `${selected.size} ` : ""}selected
          </button>
        </div>
      ) : (
        <>
          {/* Top priorities — the 3 most urgent items across the book (triage shortcut) */}
          {topPriorities.length > 0 && (
            <div>
              <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Top priorities</h2>
              <div className="space-y-1.5">
                {topPriorities.map((s) => {
                  const client = clients.find((c) => c.id === s.clientId);
                  if (!client) return null;
                  const { icon: Icon, chip, tint } = SIGNAL_STYLE[s.kind];
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => actOnSignal(s.clientId, s.target)}
                      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-white px-3.5 py-2.5 text-left transition-colors hover:bg-accent/40"
                    >
                      <ClientLogo domain={client.domain} name={client.name} size="sm" />
                      <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", tint)}>
                        <Icon className="h-3 w-3" />
                        {chip}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="text-[13px] font-medium text-foreground">{s.title}</span>
                        <span className="ml-1.5 text-[11px] text-muted-foreground">· {client.name}</span>
                      </div>
                      <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">{s.meta}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search + client directory (scan → search → jump in) */}
          <div className="space-y-2">
            <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">All clients</h2>
            <form onSubmit={submitSearch} className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients…"
                className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-ring"
              />
            </form>

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-border bg-white px-4 py-6 text-center text-[13px] text-muted-foreground">
                No clients match “{query}”.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {filtered.map((c) => {
                  const count = reviewCount.get(c.id) ?? 0;
                  const live = LIVE_CLIENT_IDS.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={!live}
                      onClick={() => { if (live) openClient(c); }}
                      className={cn(
                        "group flex h-full flex-col rounded-xl border bg-white p-4 text-left transition-all",
                        live ? "border-border hover:border-foreground/20 hover:shadow-sm" : "cursor-not-allowed border-border opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <ClientLogo domain={c.domain} name={c.name} size="lg" />
                        {!live ? (
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Coming soon</span>
                        ) : count > 0 ? (
                          <span title={`${count} to review`} className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                            {count}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 truncate text-[13px] font-semibold text-foreground">{c.name}</div>
                      <div className="mt-1">
                        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", STATUS_STYLE[c.status])}>
                          {c.status}
                        </span>
                      </div>
                      <div className="mt-auto pt-3">
                        <div className="text-[14px] font-semibold tracking-tight text-foreground">
                          {c.monthlyBudget > 0 ? `$${c.monthlyBudget.toLocaleString()}/mo` : "—"}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {c.campaigns} {c.campaigns === 1 ? "campaign" : "campaigns"}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {!q && (
                  <button
                    type="button"
                    onClick={() => setShowAdd(true)}
                    className="group flex h-full min-h-[148px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-white p-4 text-[12px] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                  >
                    <Plus className="h-5 w-5" />
                    Add client
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Add client — two clear paths: from the agency's book, or net-new. */}
          {showAdd && (
            <div className="space-y-5 rounded-2xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold text-foreground">Add a client</div>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cancel
                </button>
              </div>

              {/* Path 1 — from your book (clients you manage, not yet set up here) */}
              {undiscovered.length > 0 && (
                <div>
                  <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">From your book</div>
                  <p className="mb-2 text-[11px] text-muted-foreground">
                    Clients we found on {AGENCY.domain} that aren&apos;t set up yet — select the ones to add.
                  </p>
                  <div className="space-y-1.5">
                    {undiscovered.map((d) => {
                      const on = selected.has(d.domain);
                      return (
                        <button
                          key={d.domain}
                          type="button"
                          onClick={() => toggleDiscovered(d.domain)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                            on ? "border-[#2C9FDD] bg-[#EBF5FB]" : "border-border hover:bg-accent"
                          )}
                        >
                          <ClientLogo domain={d.domain} name={d.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-medium text-foreground">{d.name}</div>
                            <div className="text-[11px] text-muted-foreground">{d.industry} · {d.domain}</div>
                          </div>
                          <span className={cn("flex h-5 w-5 items-center justify-center rounded border", on ? "border-[#2C9FDD] bg-[#2C9FDD] text-white" : "border-border")}>
                            {on && <Check className="h-3 w-3" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={addSelected}
                    disabled={selected.size === 0}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-foreground/90 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add {selected.size > 0 ? `${selected.size} ` : ""}selected
                  </button>
                </div>
              )}

              {/* Path 2 — net-new client (paste a site, AI sets it up) */}
              <div className={cn(undiscovered.length > 0 && "border-t border-border pt-4")}>
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-[#2C9FDD]" /> New client
                </div>
                <form onSubmit={addClient} className="flex items-center gap-2">
                  <input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="Paste a client's website (e.g. represent.com)"
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-ring"
                  />
                  <button
                    type="submit"
                    disabled={!domain.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-foreground/90 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add client
                  </button>
                </form>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  We&apos;ll pull their brand, industry, assets, and competitors from the site — no manual setup.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
