"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowRight, Sparkles, Building2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCampaign } from "@/contexts/campaign-context";
import {
  AGENCY,
  BRAINLABS_TEAM,
  BRAINLABS_DISCOVERED,
  ROLE_LABELS,
  persistAgencyClients,
  ensureAgencySeed,
  inferClientFromDomain,
  discoveredToClient,
  faviconUrl,
} from "@/data/seed-agency";
import type { AgencyClient } from "@/types/campaign";

const STATUS_STYLE: Record<AgencyClient["status"], string> = {
  active: "bg-emerald-50 text-emerald-600",
  onboarding: "bg-amber-50 text-amber-600",
  paused: "bg-muted text-muted-foreground",
};

/** Client logo from favicon, with initials fallback if it fails to load. */
function ClientLogo({ domain, name }: { domain: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-[12px] font-semibold text-foreground">
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={faviconUrl(domain)}
      alt=""
      onError={() => setFailed(true)}
      className="h-9 w-9 shrink-0 rounded-lg border border-border bg-white object-contain p-1.5"
    />
  );
}

export function AgencyPortfolioView() {
  const { showToast } = useCampaign();
  const router = useRouter();
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [domain, setDomain] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
    showToast(`Pulled ${client.name}'s profile from ${client.domain} — added to your roster`);
  }

  function openClient(c: AgencyClient) {
    showToast(`Switched to ${c.name} — campaigns, audiences & reports are now scoped to them`);
    router.push("/campaigns");
  }

  const totalSpend = clients.reduce((s, c) => s + c.monthlyBudget, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-8 py-10">
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

      {/* Onboard a client — the AI-native moment */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-[#2C9FDD]" />
          Onboard a client
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

      {/* Client roster */}
      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Clients</h2>
        {clients.length === 0 ? (
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
          <div className="space-y-2">
            {clients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openClient(c)}
                className="group flex w-full items-center gap-4 rounded-xl border border-border bg-white px-4 py-3.5 text-left transition-all hover:shadow-sm"
              >
                <ClientLogo domain={c.domain} name={c.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">{c.name}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", STATUS_STYLE[c.status])}>
                      {c.status}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">
                    {c.industry} · {c.domain}
                  </div>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <div className="text-[13px] font-medium text-foreground">
                    {c.monthlyBudget > 0 ? `$${c.monthlyBudget.toLocaleString()}/mo` : "—"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {c.campaigns} {c.campaigns === 1 ? "campaign" : "campaigns"} · {c.lead}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Team & roles */}
      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Team &amp; roles</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          {BRAINLABS_TEAM.map((m, i) => (
            <div key={m.id} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-border")}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-foreground">
                {m.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-foreground">{m.name}</div>
                <div className="text-[11px] text-muted-foreground">{ROLE_LABELS[m.role].can}</div>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                {ROLE_LABELS[m.role].label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
